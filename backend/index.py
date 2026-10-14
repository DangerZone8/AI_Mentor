"""Vercel Python runtime entry point for the CodeQuest FastAPI service.

Keep the application implementation in app/main.py; this root-level export
lets Vercel discover the ASGI app when the project's Root Directory is backend.
"""
from app.main import app

__all__ = ["app"]
