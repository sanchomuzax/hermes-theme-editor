"""Integration tests for the dashboard plugin API (FastAPI routes)."""

import pytest
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))


@pytest.fixture(autouse=True)
def tmp_hermes_home(tmp_path, monkeypatch):
    """Point HERMES_HOME at a temp dir for full isolation."""
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    import config, importlib
    importlib.reload(config)
    import themes.repository as repo
    importlib.reload(repo)
    import dashboard.plugin_api as api_mod
    importlib.reload(api_mod)
    return tmp_path


@pytest.fixture()
def client(tmp_hermes_home):
    from fastapi.testclient import TestClient
    from fastapi import FastAPI
    import importlib
    import dashboard.plugin_api as api_mod
    importlib.reload(api_mod)

    app = FastAPI()
    app.include_router(api_mod.router)
    return TestClient(app)


def _theme_payload(**kwargs):
    base = {
        "name": "integration-theme",
        "label": "Integration Theme",
        "description": "Created by integration test",
        "palette": {"background": "#1a1a2e"},
        "typography": {
            "fontSans": "system-ui, sans-serif",
            "baseSize": "15px",
            "lineHeight": "1.55",
            "letterSpacing": "0",
        },
        "layout": {"radius": "0.5rem", "density": "comfortable"},
    }
    return {**base, **kwargs}


class TestListThemes:
    def test_empty_initially(self, client):
        resp = client.get("/themes")
        assert resp.status_code == 200
        assert resp.json()["themes"] == []


class TestCreateTheme:
    def test_creates_theme(self, client):
        payload = _theme_payload()
        resp = client.post("/themes", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["theme"]["name"] == "integration-theme"

    def test_conflict_on_duplicate(self, client):
        payload = _theme_payload()
        client.post("/themes", json=payload)
        resp = client.post("/themes", json=payload)
        assert resp.status_code == 409

    def test_validation_error_on_bad_name(self, client):
        payload = _theme_payload(name="Invalid Name!")
        resp = client.post("/themes", json=payload)
        assert resp.status_code == 422

    def test_theme_appears_in_list(self, client):
        client.post("/themes", json=_theme_payload())
        resp = client.get("/themes")
        names = [t["name"] for t in resp.json()["themes"]]
        assert "integration-theme" in names


class TestGetTheme:
    def test_get_existing(self, client):
        client.post("/themes", json=_theme_payload())
        resp = client.get("/themes/integration-theme")
        assert resp.status_code == 200
        assert resp.json()["theme"]["name"] == "integration-theme"

    def test_get_missing_returns_404(self, client):
        resp = client.get("/themes/no-such-theme")
        assert resp.status_code == 404


class TestUpdateTheme:
    def test_updates_label(self, client):
        client.post("/themes", json=_theme_payload())
        updated = _theme_payload(label="Updated Label")
        resp = client.put("/themes/integration-theme", json=updated)
        assert resp.status_code == 200
        assert resp.json()["theme"]["label"] == "Updated Label"

    def test_name_mismatch_returns_422(self, client):
        client.post("/themes", json=_theme_payload())
        payload = _theme_payload(name="different-name")
        resp = client.put("/themes/integration-theme", json=payload)
        assert resp.status_code == 422


class TestDeleteTheme:
    def test_deletes_existing(self, client):
        client.post("/themes", json=_theme_payload())
        resp = client.delete("/themes/integration-theme")
        assert resp.status_code == 200
        assert resp.json()["deleted"] == "integration-theme"

    def test_delete_missing_returns_404(self, client):
        resp = client.delete("/themes/no-such-theme")
        assert resp.status_code == 404


class TestHealthEndpoint:
    def test_health_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
        assert resp.json()["plugin"] == "hermes-theme-editor"
