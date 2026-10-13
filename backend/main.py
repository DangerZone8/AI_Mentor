"""Vercel ASGI entrypoint for the CodeQuest FastAPI application.

Deploy this project with Vercel Root Directory set to `backend`.
"""
from app.main import app

__all__ = ["app"]
