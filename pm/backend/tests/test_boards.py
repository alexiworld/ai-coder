"""Tests for multi-board management, column management, card priorities/due dates."""
import secrets
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def _login(username: str | None = None, password: str = "password123") -> str:
    username = username or f"user-{secrets.token_hex(4)}"
    res = client.post("/api/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200
    return res.json()["token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestMultiBoard:
    def test_list_boards_initially_one(self):
        token = _login()
        res = client.get("/api/boards", headers=_auth(token))
        assert res.status_code == 200
        boards = res.json()
        assert len(boards) == 1
        assert boards[0]["name"] == "My Board"
        assert boards[0]["column_count"] == 5
        assert boards[0]["card_count"] == 0

    def test_create_board(self):
        token = _login()
        res = client.post("/api/boards", headers=_auth(token), json={"name": "Sprint 1"})
        assert res.status_code == 200
        board = res.json()
        assert board["name"] == "Sprint 1"
        assert len(board["columns"]) == 5
        assert isinstance(board["id"], int)

    def test_list_boards_after_create(self):
        token = _login()
        client.post("/api/boards", headers=_auth(token), json={"name": "Board A"})
        client.post("/api/boards", headers=_auth(token), json={"name": "Board B"})
        res = client.get("/api/boards", headers=_auth(token))
        assert res.status_code == 200
        names = [b["name"] for b in res.json()]
        assert "My Board" in names
        assert "Board A" in names
        assert "Board B" in names

    def test_get_specific_board(self):
        token = _login()
        create_res = client.post("/api/boards", headers=_auth(token), json={"name": "Dev Board"})
        board_id = create_res.json()["id"]

        res = client.get(f"/api/boards/{board_id}", headers=_auth(token))
        assert res.status_code == 200
        assert res.json()["name"] == "Dev Board"
        assert res.json()["id"] == board_id

    def test_get_board_not_owned(self):
        token_a = _login()
        token_b = _login()
        create_res = client.post("/api/boards", headers=_auth(token_a), json={"name": "Private"})
        board_id = create_res.json()["id"]

        res = client.get(f"/api/boards/{board_id}", headers=_auth(token_b))
        assert res.status_code == 404

    def test_rename_board(self):
        token = _login()
        create_res = client.post("/api/boards", headers=_auth(token), json={"name": "Old Name"})
        board_id = create_res.json()["id"]

        res = client.put(
            f"/api/boards/{board_id}/name",
            headers=_auth(token),
            json={"name": "New Name"},
        )
        assert res.status_code == 200

        get_res = client.get(f"/api/boards/{board_id}", headers=_auth(token))
        assert get_res.json()["name"] == "New Name"

    def test_rename_board_empty_name(self):
        token = _login()
        create_res = client.post("/api/boards", headers=_auth(token), json={"name": "Board"})
        board_id = create_res.json()["id"]
        res = client.put(f"/api/boards/{board_id}/name", headers=_auth(token), json={"name": ""})
        assert res.status_code == 422

    def test_delete_board(self):
        token = _login()
        create_res = client.post("/api/boards", headers=_auth(token), json={"name": "Temp"})
        board_id = create_res.json()["id"]

        del_res = client.delete(f"/api/boards/{board_id}", headers=_auth(token))
        assert del_res.status_code == 200

        boards = client.get("/api/boards", headers=_auth(token)).json()
        assert not any(b["id"] == board_id for b in boards)

    def test_cannot_delete_only_board(self):
        token = _login()
        boards = client.get("/api/boards", headers=_auth(token)).json()
        board_id = boards[0]["id"]
        res = client.delete(f"/api/boards/{board_id}", headers=_auth(token))
        assert res.status_code == 400

    def test_boards_are_isolated_between_users(self):
        token_a = _login()
        token_b = _login()

        # Add card to user A's board
        board_a = client.get("/api/board", headers=_auth(token_a)).json()
        col_id = board_a["columns"][0]["id"]
        client.post(
            "/api/board/cards",
            headers=_auth(token_a),
            json={"column_id": col_id, "title": "User A card", "details": ""},
        )

        # User B's board should be empty
        board_b = client.get("/api/board", headers=_auth(token_b)).json()
        assert len(board_b["cards"]) == 0

    def test_add_card_to_specific_board(self):
        token = _login()
        create_res = client.post("/api/boards", headers=_auth(token), json={"name": "Work"})
        board_id = create_res.json()["id"]
        board = client.get(f"/api/boards/{board_id}", headers=_auth(token)).json()
        col_id = board["columns"][0]["id"]

        card_res = client.post(
            f"/api/boards/{board_id}/cards",
            headers=_auth(token),
            json={"column_id": col_id, "title": "Task 1", "details": ""},
        )
        assert card_res.status_code == 200

        # Verify card is on the right board
        updated = client.get(f"/api/boards/{board_id}", headers=_auth(token)).json()
        assert len(updated["cards"]) == 1

        # Verify default board is unaffected
        default = client.get("/api/board", headers=_auth(token)).json()
        assert len(default["cards"]) == 0


class TestColumnManagement:
    def test_add_column(self):
        token = _login()
        res = client.post(
            "/api/board/columns",
            headers=_auth(token),
            json={"title": "QA Testing"},
        )
        assert res.status_code == 200
        col_id = res.json()["column_id"]
        assert col_id.startswith("col-")

        board = client.get("/api/board", headers=_auth(token)).json()
        col_titles = [c["title"] for c in board["columns"]]
        assert "QA Testing" in col_titles

    def test_add_column_with_color(self):
        token = _login()
        res = client.post(
            "/api/board/columns",
            headers=_auth(token),
            json={"title": "Blocked", "color": "#ff0000"},
        )
        assert res.status_code == 200

        board = client.get("/api/board", headers=_auth(token)).json()
        blocked_col = next(c for c in board["columns"] if c["title"] == "Blocked")
        assert blocked_col["color"] == "#ff0000"

    def test_delete_column(self):
        token = _login()
        board = client.get("/api/board", headers=_auth(token)).json()
        col_id = board["columns"][-1]["id"]

        res = client.delete(f"/api/board/columns/{col_id}", headers=_auth(token))
        assert res.status_code == 200

        updated = client.get("/api/board", headers=_auth(token)).json()
        assert not any(c["id"] == col_id for c in updated["columns"])

    def test_delete_column_cascades_cards(self):
        token = _login()
        # Add card to a column then delete the column
        board = client.get("/api/board", headers=_auth(token)).json()
        col_id = board["columns"][-1]["id"]

        card_res = client.post(
            "/api/board/cards",
            headers=_auth(token),
            json={"column_id": col_id, "title": "Orphan card", "details": ""},
        )
        card_id = card_res.json()["card_id"]

        client.delete(f"/api/board/columns/{col_id}", headers=_auth(token))

        updated = client.get("/api/board", headers=_auth(token)).json()
        assert card_id not in updated["cards"]

    def test_delete_nonexistent_column(self):
        token = _login()
        res = client.delete("/api/board/columns/col-nonexistent", headers=_auth(token))
        assert res.status_code == 404

    def test_add_column_to_specific_board(self):
        token = _login()
        create_res = client.post("/api/boards", headers=_auth(token), json={"name": "Sprint"})
        board_id = create_res.json()["id"]

        res = client.post(
            f"/api/boards/{board_id}/columns",
            headers=_auth(token),
            json={"title": "Waiting"},
        )
        assert res.status_code == 200

        board = client.get(f"/api/boards/{board_id}", headers=_auth(token)).json()
        assert any(c["title"] == "Waiting" for c in board["columns"])


class TestCardPriorityAndDueDate:
    def test_add_card_with_priority(self):
        token = _login()
        board = client.get("/api/board", headers=_auth(token)).json()
        col_id = board["columns"][0]["id"]

        res = client.post(
            "/api/board/cards",
            headers=_auth(token),
            json={"column_id": col_id, "title": "Critical bug", "details": "", "priority": "critical"},
        )
        assert res.status_code == 200
        card_id = res.json()["card_id"]

        updated = client.get("/api/board", headers=_auth(token)).json()
        assert updated["cards"][card_id]["priority"] == "critical"

    def test_add_card_default_priority(self):
        token = _login()
        board = client.get("/api/board", headers=_auth(token)).json()
        col_id = board["columns"][0]["id"]

        res = client.post(
            "/api/board/cards",
            headers=_auth(token),
            json={"column_id": col_id, "title": "Normal task", "details": ""},
        )
        card_id = res.json()["card_id"]

        updated = client.get("/api/board", headers=_auth(token)).json()
        assert updated["cards"][card_id]["priority"] == "medium"

    def test_add_card_with_due_date(self):
        token = _login()
        board = client.get("/api/board", headers=_auth(token)).json()
        col_id = board["columns"][0]["id"]

        res = client.post(
            "/api/board/cards",
            headers=_auth(token),
            json={"column_id": col_id, "title": "Deadline task", "details": "", "due_date": "2026-07-01"},
        )
        card_id = res.json()["card_id"]

        updated = client.get("/api/board", headers=_auth(token)).json()
        assert updated["cards"][card_id]["due_date"] == "2026-07-01"

    def test_edit_card_priority(self):
        token = _login()
        board = client.get("/api/board", headers=_auth(token)).json()
        col_id = board["columns"][0]["id"]

        add_res = client.post(
            "/api/board/cards",
            headers=_auth(token),
            json={"column_id": col_id, "title": "Task", "details": ""},
        )
        card_id = add_res.json()["card_id"]

        edit_res = client.put(
            f"/api/board/cards/{card_id}",
            headers=_auth(token),
            json={"priority": "high"},
        )
        assert edit_res.status_code == 200

        updated = client.get("/api/board", headers=_auth(token)).json()
        assert updated["cards"][card_id]["priority"] == "high"

    def test_edit_card_due_date(self):
        token = _login()
        board = client.get("/api/board", headers=_auth(token)).json()
        col_id = board["columns"][0]["id"]

        add_res = client.post(
            "/api/board/cards",
            headers=_auth(token),
            json={"column_id": col_id, "title": "Task", "details": ""},
        )
        card_id = add_res.json()["card_id"]

        client.put(
            f"/api/board/cards/{card_id}",
            headers=_auth(token),
            json={"due_date": "2026-08-15"},
        )
        updated = client.get("/api/board", headers=_auth(token)).json()
        assert updated["cards"][card_id]["due_date"] == "2026-08-15"

    def test_priority_values_all_levels(self):
        token = _login()
        board = client.get("/api/board", headers=_auth(token)).json()
        col_id = board["columns"][0]["id"]

        for priority in ["low", "medium", "high", "critical"]:
            res = client.post(
                "/api/board/cards",
                headers=_auth(token),
                json={"column_id": col_id, "title": f"Task {priority}", "details": "", "priority": priority},
            )
            card_id = res.json()["card_id"]
            updated = client.get("/api/board", headers=_auth(token)).json()
            assert updated["cards"][card_id]["priority"] == priority


class TestPasswordAuth:
    def test_new_user_creates_account_with_password(self):
        username = f"new-{secrets.token_hex(4)}"
        res = client.post(
            "/api/auth/login", json={"username": username, "password": "mypassword"}
        )
        assert res.status_code == 200
        assert res.json()["username"] == username

    def test_existing_user_correct_password(self):
        username = f"auth-{secrets.token_hex(4)}"
        # Create account
        client.post("/api/auth/login", json={"username": username, "password": "secret123"})
        # Login again with correct password
        res = client.post("/api/auth/login", json={"username": username, "password": "secret123"})
        assert res.status_code == 200

    def test_existing_user_wrong_password(self):
        username = f"auth-{secrets.token_hex(4)}"
        client.post("/api/auth/login", json={"username": username, "password": "correctpass"})
        res = client.post("/api/auth/login", json={"username": username, "password": "wrongpass"})
        assert res.status_code == 401

    def test_change_password(self):
        username = f"chpw-{secrets.token_hex(4)}"
        token = _login(username, "oldpassword")

        res = client.put(
            "/api/auth/me/password",
            headers=_auth(token),
            json={"current_password": "oldpassword", "new_password": "newpassword123"},
        )
        assert res.status_code == 200

        # Old password should fail
        fail_res = client.post(
            "/api/auth/login", json={"username": username, "password": "oldpassword"}
        )
        assert fail_res.status_code == 401

        # New password should succeed
        ok_res = client.post(
            "/api/auth/login", json={"username": username, "password": "newpassword123"}
        )
        assert ok_res.status_code == 200

    def test_change_password_wrong_current(self):
        username = f"chpw-{secrets.token_hex(4)}"
        token = _login(username, "realpassword")

        res = client.put(
            "/api/auth/me/password",
            headers=_auth(token),
            json={"current_password": "wrongcurrent", "new_password": "newpass123"},
        )
        assert res.status_code == 401

    def test_change_password_too_short(self):
        username = f"chpw-{secrets.token_hex(4)}"
        token = _login(username, "realpassword")

        res = client.put(
            "/api/auth/me/password",
            headers=_auth(token),
            json={"current_password": "realpassword", "new_password": "abc"},
        )
        assert res.status_code == 422


class TestBoardApiResponse:
    def test_board_out_includes_id_and_name(self):
        token = _login()
        res = client.get("/api/board", headers=_auth(token))
        assert res.status_code == 200
        data = res.json()
        assert "id" in data
        assert "name" in data
        assert data["name"] == "My Board"

    def test_column_out_includes_color(self):
        token = _login()
        res = client.get("/api/board", headers=_auth(token))
        assert res.status_code == 200
        # Color field exists (may be null for default columns)
        for col in res.json()["columns"]:
            assert "color" in col

    def test_card_out_includes_priority_and_due_date(self):
        token = _login()
        board = client.get("/api/board", headers=_auth(token)).json()
        col_id = board["columns"][0]["id"]

        add_res = client.post(
            "/api/board/cards",
            headers=_auth(token),
            json={"column_id": col_id, "title": "Card", "details": "", "priority": "high", "due_date": "2026-12-31"},
        )
        card_id = add_res.json()["card_id"]

        board = client.get("/api/board", headers=_auth(token)).json()
        card = board["cards"][card_id]
        assert card["priority"] == "high"
        assert card["due_date"] == "2026-12-31"
