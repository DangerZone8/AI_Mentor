import unittest

from app.main import app as application
import index


class VercelEntrypointTests(unittest.TestCase):
    def test_vercel_entrypoint_exports_the_fastapi_application(self):
        self.assertIs(index.app, application)


if __name__ == "__main__":
    unittest.main()
