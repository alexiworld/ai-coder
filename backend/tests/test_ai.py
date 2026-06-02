import os
import json
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _setup_env():
    """Remove API key before each test for missing key test, restore after."""
    old_key = os.environ.pop("OPENROUTER_API_KEY", None)
    yield
    if old_key:
        os.environ["OPENROUTER_API_KEY"] = old_key


def _login() -> str:
    resp = client.post(
        "/api/auth/login",
        json={"username": "user", "password": "password"},
    )
    return resp.json()["token"]


def test_ai_test_missing_key():
    """When OPENROUTER_API_KEY is not set, returns 503."""
    token = _login()
    resp = client.post(
        "/api/ai/test",
        headers={"Authorization": f"Bearer {token}"},
        json={"prompt": "What is 2+2?"},
    )
    assert resp.status_code == 503
    assert "API key not configured" in resp.json()["detail"]


def test_ai_test_success():
    """With mocked call_ai, returns the mocked response."""
    with patch("backend.routers.ai.get_client", return_value=MagicMock()), \
         patch("backend.routers.ai.call_ai", return_value="4"):
        token = _login()
        resp = client.post(
            "/api/ai/test",
            headers={"Authorization": f"Bearer {token}"},
            json={"prompt": "What is 2+2?"},
        )
        assert resp.status_code == 200
        assert resp.json()["response"] == "4"


def test_ai_test_auth_required():
    """AI endpoint returns 401 without auth token."""
    resp = client.post("/api/ai/test", json={"prompt": "What is 2+2?"})
    assert resp.status_code == 401


def test_ai_chat_missing_key():
    """Chat endpoint returns 503 when API key is missing."""
    token = _login()
    resp = client.post(
        "/api/ai/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": "Hello"},
    )
    assert resp.status_code == 503


def test_ai_chat_simple_question():
    """Chat endpoint returns response for a simple question."""
    mock_response = json.dumps({
        "message": "Your board has 5 columns.",
        "board_updates": None,
    })
    with patch("backend.routers.ai.get_client", return_value=MagicMock()), \
         patch("backend.routers.ai.call_ai", return_value=mock_response):
        token = _login()
        resp = client.post(
            "/api/ai/chat",
            headers={"Authorization": f"Bearer {token}"},
            json={"message": "How many columns?"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "Your board has 5 columns" in data["message"]
        assert "board" in data
        assert len(data["board"]["columns"]) == 5


def test_ai_chat_with_board_update():
    """Chat endpoint applies board updates from AI."""
    mock_response = json.dumps({
        "message": "I added a card for you.",
        "board_updates": {
            "add_cards": [
                {"column_id": "col-backlog", "title": "AI Card", "details": "Created by AI"}
            ],
            "move_cards": [],
            "edit_cards": [],
            "delete_card_ids": [],
        },
    })
    with patch("backend.routers.ai.get_client", return_value=MagicMock()), \
         patch("backend.routers.ai.call_ai", return_value=mock_response):
        token = _login()
        resp = client.post(
            "/api/ai/chat",
            headers={"Authorization": f"Bearer {token}"},
            json={"message": "Add a card to backlog"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "I added a card" in data["message"]

        # Verify the card was actually added to the board
        backlog = [c for c in data["board"]["columns"] if c["id"] == "col-backlog"][0]
        assert len(backlog["cardIds"]) > 0


def test_ai_chat_auth_required():
    """Chat endpoint returns 401 without auth token."""
    resp = client.post("/api/ai/chat", json={"message": "Hello"})
    assert resp.status_code == 401


def test_ai_chat_invalid_json():
    """Chat endpoint handles invalid AI response gracefully."""
    with patch("backend.routers.ai.get_client", return_value=MagicMock()), \
         patch("backend.routers.ai.call_ai", return_value="invalid json"):
        token = _login()
        resp = client.post(
            "/api/ai/chat",
            headers={"Authorization": f"Bearer {token}"},
            json={"message": "Hello"},
        )
        assert resp.status_code == 502