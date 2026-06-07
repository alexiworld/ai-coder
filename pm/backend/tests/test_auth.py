from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_login_success():
    response = client.post(
        "/api/auth/login",
        json={"username": "user", "password": "password"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["username"] == "user"


def test_login_any_user_works():
    response = client.post(
        "/api/auth/login",
        json={"username": "newuser", "password": "anypass"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["username"] == "newuser"


def test_login_empty_username():
    response = client.post(
        "/api/auth/login",
        json={"username": "", "password": "password"},
    )
    assert response.status_code == 401


def test_me_with_valid_token():
    login_res = client.post(
        "/api/auth/login",
        json={"username": "user", "password": "password"},
    )
    token = login_res.json()["token"]

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["username"] == "user"


def test_me_without_token():
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_with_invalid_token():
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired token"


def test_logout():
    login_res = client.post(
        "/api/auth/login",
        json={"username": "user", "password": "password"},
    )
    token = login_res.json()["token"]

    response = client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200

    # Token should now be invalid
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 401


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}