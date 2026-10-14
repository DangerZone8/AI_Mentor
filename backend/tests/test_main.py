import os
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import (
    ai_mentor_config,
    app,
    authenticated_user,
    generate_mentor_answer,
)


class CodeQuestApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        app.dependency_overrides[authenticated_user] = lambda: {
            "id": "c6d0a1b5-7e89-4e4c-9a4b-01d8f7c6a123",
            "email": "learner@example.test",
            "display_name": "Learner",
        }

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_liveness_endpoint(self):
        response = self.client.get("/health/live")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "alive"})

    def test_readiness_reports_capabilities_without_exposing_secrets(self):
        env = {
            "SUPABASE_URL": "https://project.example.test",
            "SUPABASE_PUBLISHABLE_KEY": "public-test-key",
            "SUPABASE_SERVICE_ROLE_KEY": "private-test-key",
            "OPENAI_API_KEY": "private-ai-test-key",
            "RUNNER_API_URL": "https://runner.example.test",
            "RUNNER_API_KEY": "private-runner-key",
        }
        with patch.dict(os.environ, env, clear=True):
            response = self.client.get("/health/ready")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["capabilities"]["authentication"])
        self.assertTrue(payload["capabilities"]["ai_mentor"])
        self.assertTrue(payload["capabilities"]["isolated_python_runner"])
        self.assertTrue(payload["capabilities"]["global_leaderboard"])
        self.assertNotIn("private-ai-test-key", response.text)
        self.assertNotIn("private-test-key", response.text)

    def test_ai_mentor_returns_answer_from_provider_adapter(self):
        with patch("app.main.generate_mentor_answer", new=AsyncMock(return_value="Use a dictionary for constant-time lookup.")):
            response = self.client.post(
                "/api/v1/mentor/chat",
                json={"messages": [{"role": "user", "content": "How do I optimize two sum?"}]},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["answer"], "Use a dictionary for constant-time lookup.")

    def test_ai_mentor_rejects_non_alternating_conversation(self):
        response = self.client.post(
            "/api/v1/mentor/chat",
            json={
                "messages": [
                    {"role": "user", "content": "First question"},
                    {"role": "user", "content": "Second question"},
                ]
            },
        )
        self.assertEqual(response.status_code, 422)

    def test_ai_mentor_rejects_assistant_as_latest_message(self):
        response = self.client.post(
            "/api/v1/mentor/chat",
            json={"messages": [{"role": "assistant", "content": "An answer without a question"}]},
        )
        self.assertEqual(response.status_code, 422)

    def test_ai_configuration_fails_clearly_when_key_is_missing(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": ""}, clear=False):
            with self.assertRaises(Exception) as raised:
                ai_mentor_config()
        self.assertEqual(getattr(raised.exception, "status_code", None), 503)

    def test_provider_adapter_rejects_missing_key_before_network_call(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": ""}, clear=False):
            with self.assertRaises(Exception) as raised:
                import asyncio
                asyncio.run(generate_mentor_answer([]))
        self.assertEqual(getattr(raised.exception, "status_code", None), 503)


if __name__ == "__main__":
    unittest.main()
