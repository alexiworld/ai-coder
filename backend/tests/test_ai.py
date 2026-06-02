import os
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_ai_test_missing_key():
    """When OPENROUTER_API_KEY is not set, returns 503."""
    old_key = os.environ.pop("OPENROUTER_API_KEY", None)
    try:
        resp = client.post(
            "/api/auth/login",
            json={"username": "user", "password": "password"},
        )
        token = resp.json()["token"]

        resp2 = client.post(
            "/api/ai/test",
            headers={"Authorization": f"Bearer {token}"},
            json={"prompt": "What is 2+2?"},
        )
        assert resp2.status_code == 503
        assert "API key not configured" in resp2.json()["detail"]
    finally:
        if old_key:
            os.environ["OPENROUTER_API_KEY"] = old_key


def test_ai_test_success():
    """When API key is present, AI call succeeds."""
    with patch("backend.routers.ai.call_ai", return_value="4"):
        resp = client.post(
            "/api/auth/login",
            json={"username": "user", "password": "password"},
        )
        token = resp.json()["token"]

        resp2 = client.post(
            "/api/ai/test",
            headers={"Authorization": f"Bearer {token}"},
            json={"prompt": "What is 2+2?"},
        )
        assert resp2.status_code == 200
        assert resp2.json()["response"] == "4"


def test_ai_test_auth_required():
    """AI endpoint returns 401 without auth token."""
    resp = client.post(
        "/api/ai/test",
        json={"prompt": "What is 2+2?"},
    )
    assert resp.status_code == 401