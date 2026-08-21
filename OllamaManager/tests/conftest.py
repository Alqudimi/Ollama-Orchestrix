import pytest
from fastapi.testclient import TestClient
from src.ollama_manager.main import app
from src.ollama_manager.core.security import create_access_token
from src.ollama_manager.core.config import settings

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def admin_token():
    return create_access_token(
        data={"sub": "admin", "scopes": ["admin", "manager", "viewer"]}
    )

@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture
def viewer_token():
    return create_access_token(
        data={"sub": "viewer", "scopes": ["viewer"]}
    )

@pytest.fixture
def viewer_headers(viewer_token):
    return {"Authorization": f"Bearer {viewer_token}"}
