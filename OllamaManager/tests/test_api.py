import pytest
from fastapi.testclient import TestClient

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "name" in response.json()
    assert "version" in response.json()

def test_system_health(client):
    response = client.get("/system/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "status" in data["data"]

def test_auth_unauthorized(client):
    # محاولة الوصول لمسار محمي بدون توكن
    response = client.get("/models")
    assert response.status_code == 401

def test_modelfile_validate(client, admin_headers):
    payload = {"content": "FROM llama3\nPARAMETER temperature 0.7"}
    response = client.post("/modelfile/validate", json=payload, headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["valid"] is True

def test_modelfile_validate_invalid(client, admin_headers):
    payload = {"content": "PARAMETER temperature 0.7"} # Missing FROM
    response = client.post("/modelfile/validate", json=payload, headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["valid"] is False
    assert "Missing required FROM instruction" in data["data"]["errors"]
