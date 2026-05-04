"""Unit tests for themes/repository.py."""

import pytest
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))


@pytest.fixture(autouse=True)
def use_tmp_themes_dir(tmp_path, monkeypatch):
    """Redirect THEMES_DIR to a temp directory for every test."""
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    import config
    import importlib
    importlib.reload(config)
    import themes.repository as repo
    importlib.reload(repo)
    yield repo


def _make_theme(**kwargs):
    base = {
        "name": "test-theme",
        "label": "Test Theme",
        "description": "A test theme",
        "palette": {"background": "#041c1c"},
        "typography": {"fontSans": "system-ui", "baseSize": "15px", "lineHeight": "1.55", "letterSpacing": "0"},
        "layout": {"radius": "0.5rem", "density": "comfortable"},
    }
    return {**base, **kwargs}


class TestListThemes:
    def test_empty_dir_returns_empty(self, use_tmp_themes_dir):
        assert use_tmp_themes_dir.list_themes() == []

    def test_returns_saved_themes(self, use_tmp_themes_dir):
        use_tmp_themes_dir.save_theme(_make_theme())
        themes = use_tmp_themes_dir.list_themes()
        assert len(themes) == 1
        assert themes[0]["name"] == "test-theme"

    def test_skips_corrupt_yaml(self, use_tmp_themes_dir, tmp_path):
        bad = (tmp_path / "dashboard-themes" / "bad.yaml")
        bad.parent.mkdir(parents=True, exist_ok=True)
        bad.write_text("{invalid yaml [[[", encoding="utf-8")
        themes = use_tmp_themes_dir.list_themes()
        assert themes == []


class TestGetTheme:
    def test_returns_none_for_missing(self, use_tmp_themes_dir):
        assert use_tmp_themes_dir.get_theme("nonexistent") is None

    def test_returns_saved_theme(self, use_tmp_themes_dir):
        use_tmp_themes_dir.save_theme(_make_theme())
        theme = use_tmp_themes_dir.get_theme("test-theme")
        assert theme is not None
        assert theme["name"] == "test-theme"


class TestSaveTheme:
    def test_creates_file(self, use_tmp_themes_dir, tmp_path):
        use_tmp_themes_dir.save_theme(_make_theme())
        assert (tmp_path / "dashboard-themes" / "test-theme.yaml").exists()

    def test_returns_validated_dict(self, use_tmp_themes_dir):
        result = use_tmp_themes_dir.save_theme(_make_theme())
        assert result["name"] == "test-theme"
        assert result["label"] == "Test Theme"

    def test_overwrites_existing(self, use_tmp_themes_dir):
        use_tmp_themes_dir.save_theme(_make_theme(label="Original"))
        use_tmp_themes_dir.save_theme(_make_theme(label="Updated"))
        theme = use_tmp_themes_dir.get_theme("test-theme")
        assert theme["label"] == "Updated"

    def test_does_not_mutate_input(self, use_tmp_themes_dir):
        data = _make_theme()
        original_id = id(data)
        use_tmp_themes_dir.save_theme(data)
        assert id(data) == original_id

    def test_rejects_invalid_name(self, use_tmp_themes_dir):
        from themes.validator import ValidationError
        with pytest.raises(ValidationError):
            use_tmp_themes_dir.save_theme(_make_theme(name="Invalid Name!"))


class TestDeleteTheme:
    def test_deletes_existing(self, use_tmp_themes_dir):
        use_tmp_themes_dir.save_theme(_make_theme())
        assert use_tmp_themes_dir.delete_theme("test-theme") is True
        assert use_tmp_themes_dir.get_theme("test-theme") is None

    def test_returns_false_for_missing(self, use_tmp_themes_dir):
        assert use_tmp_themes_dir.delete_theme("no-such-theme") is False

    def test_rejects_path_traversal(self, use_tmp_themes_dir):
        from themes.validator import ValidationError
        with pytest.raises(ValidationError):
            use_tmp_themes_dir.delete_theme("../../../etc/passwd")


class TestThemeExists:
    def test_false_when_missing(self, use_tmp_themes_dir):
        assert use_tmp_themes_dir.theme_exists("nothing") is False

    def test_true_after_save(self, use_tmp_themes_dir):
        use_tmp_themes_dir.save_theme(_make_theme())
        assert use_tmp_themes_dir.theme_exists("test-theme") is True
