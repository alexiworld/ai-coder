import pytest
import secrets
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def _login(username: str = "user") -> str:
    res = client.post(
        "/api/auth/login",
        json={"username": username, "password": "password"},
    )
    return res.json()["token"]


class TestBoard:
    def test_get_board_returns_columns(self):
        user = f"test-{secrets.token_hex(4)}"
        token = _login(user)
        res = client.get("/api/board", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert len(data["columns"]) == 5
        assert data["columns"][0]["id"] == "col-backlog"
        assert data["columns"][0]["title"] == "Backlog"
        assert data["columns"][0]["cardIds"] == []

    def test_add_card(self):
        user = f"test-{secrets.token_hex(4)}"
        token = _login(user)
        res = client.post(
            "/api/board/cards",
            headers={"Authorization": f"Bearer {token}"},
            json={"column_id": "col-backlog", "title": "Test card", "details": "Test details"},
        )
        assert res.status_code == 200
        card_id = res.json()["card_id"]
        assert card_id.startswith("card-")

        board = client.get("/api/board", headers={"Authorization": f"Bearer {token}"})
        cols = board.json()["columns"]
        backlog = [c for c in cols if c["id"] == "col-backlog"][0]
        assert card_id in backlog["cardIds"]

    def test_add_card_invalid_column(self):
        user = f"test-{secrets.token_hex(4)}"
        token = _login(user)
        res = client.post(
            "/api/board/cards",
            headers={"Authorization": f"Bearer {token}"},
            json={"column_id": "col-invalid", "title": "Test", "details": ""},
        )
        assert res.status_code == 404

    def test_rename_column(self):
        user = f"test-{secrets.token_hex(4)}"
        token = _login(user)
        res = client.put(
            "/api/board/columns/col-backlog/rename",
            headers={"Authorization": f"Bearer {token}"},
            json={"title": "New Name"},
        )
        assert res.status_code == 200

        board = client.get("/api/board", headers={"Authorization": f"Bearer {token}"})
        cols = board.json()["columns"]
        backlog = [c for c in cols if c["id"] == "col-backlog"][0]
        assert backlog["title"] == "New Name"

    def test_move_card(self):
        user = f"test-{secrets.token_hex(4)}"
        token = _login(user)
        add = client.post(
            "/api/board/cards",
            headers={"Authorization": f"Bearer {token}"},
            json={"column_id": "col-backlog", "title": "Move me", "details": ""},
        )
        card_id = add.json()["card_id"]

        res = client.put(
            f"/api/board/cards/{card_id}/move",
            headers={"Authorization": f"Bearer {token}"},
            json={"target_column_id": "col-done"},
        )
        assert res.status_code == 200

        board = client.get("/api/board", headers={"Authorization": f"Bearer {token}"})
        cols = board.json()["columns"]
        backlog = [c for c in cols if c["id"] == "col-backlog"][0]
        done = [c for c in cols if c["id"] == "col-done"][0]
        assert card_id not in backlog["cardIds"]
        assert card_id in done["cardIds"]

    def test_move_card_invalid_target(self):
        user = f"test-{secrets.token_hex(4)}"
        token = _login(user)
        add = client.post(
            "/api/board/cards",
            headers={"Authorization": f"Bearer {token}"},
            json={"column_id": "col-backlog", "title": "Test", "details": ""},
        )
        card_id = add.json()["card_id"]

        res = client.put(
            f"/api/board/cards/{card_id}/move",
            headers={"Authorization": f"Bearer {token}"},
            json={"target_column_id": "col-invalid"},
        )
        assert res.status_code == 404

    def test_delete_card(self):
        user = f"test-{secrets.token_hex(4)}"
        token = _login(user)
        add = client.post(
            "/api/board/cards",
            headers={"Authorization": f"Bearer {token}"},
            json={"column_id": "col-backlog", "title": "Delete me", "details": ""},
        )
        card_id = add.json()["card_id"]

        res = client.delete(
            f"/api/board/cards/{card_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200

        board = client.get("/api/board", headers={"Authorization": f"Bearer {token}"})
        assert card_id not in board.json()["cards"]

    def test_delete_card_not_found(self):
        user = f"test-{secrets.token_hex(4)}"
        token = _login(user)
        res = client.delete(
            "/api/board/cards/card-nonexistent",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 404

    def test_edit_card(self):
        user = f"test-{secrets.token_hex(4)}"
        token = _login(user)
        add = client.post(
            "/api/board/cards",
            headers={"Authorization": f"Bearer {token}"},
            json={"column_id": "col-discovery", "title": "Original", "details": "Original details"},
        )
        card_id = add.json()["card_id"]

        res = client.put(
            f"/api/board/cards/{card_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"title": "Updated", "details": "Updated details"},
        )
        assert res.status_code == 200

        board = client.get("/api/board", headers={"Authorization": f"Bearer {token}"})
        assert board.json()["cards"][card_id]["title"] == "Updated"
        assert board.json()["cards"][card_id]["details"] == "Updated details"

    def test_board_requires_auth(self):
        res = client.get("/api/board")
        assert res.status_code == 401

    def test_board_seeds_for_new_user(self):
        unique_user = f"fresh-{secrets.token_hex(4)}"
        token = _login(unique_user)
        res = client.get("/api/board", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert len(data["columns"]) == 5
        assert [c["title"] for c in data["columns"]] == [
            "Backlog", "Discovery", "In Progress", "Review", "Done",
        ]