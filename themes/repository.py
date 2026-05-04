"""CRUD persistence layer for user dashboard themes.

Themes are stored as individual YAML files under ~/.hermes/dashboard-themes/.
All writes are atomic (temp-file + os.replace) to prevent corruption.
"""

import os
import tempfile
from pathlib import Path
from typing import Optional

import yaml

from config import THEMES_DIR
from themes.validator import validate_theme_dict, ValidationError


def _themes_dir() -> Path:
    d = THEMES_DIR
    d.mkdir(parents=True, exist_ok=True)
    return d


def list_themes() -> list[dict]:
    """Return all valid user themes, sorted by name."""
    d = _themes_dir()
    result = []
    for f in sorted(d.glob("*.yaml")):
        try:
            data = yaml.safe_load(f.read_text(encoding="utf-8"))
            if isinstance(data, dict) and data.get("name"):
                result.append(data)
        except Exception:
            continue
    return result


def get_theme(name: str) -> Optional[dict]:
    """Return a single theme dict or None if not found."""
    path = _themes_dir() / f"{name}.yaml"
    if not path.exists():
        return None
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def save_theme(data: dict) -> dict:
    """
    Create or update a theme.  Validates, then writes atomically.
    Returns the sanitised theme dict.
    Raises ValidationError on invalid input.
    """
    validated = validate_theme_dict(data)
    name = validated["name"]

    _ensure_safe_path(name)

    yaml_text = yaml.dump(
        validated,
        allow_unicode=True,
        default_flow_style=False,
        sort_keys=False,
    )

    target = _themes_dir() / f"{name}.yaml"
    _atomic_write(target, yaml_text)
    return validated


def delete_theme(name: str) -> bool:
    """Delete a theme file.  Returns True if deleted, False if not found."""
    _ensure_safe_path(name)
    path = _themes_dir() / f"{name}.yaml"
    if not path.exists():
        return False
    path.unlink()
    return True


def theme_exists(name: str) -> bool:
    _ensure_safe_path(name)
    return (_themes_dir() / f"{name}.yaml").exists()


def _ensure_safe_path(name: str) -> None:
    """Guard against path traversal via the slug."""
    if not name or "/" in name or "\\" in name or name.startswith("."):
        raise ValidationError(f"Unsafe theme name: {name!r}")
    resolved = (_themes_dir() / f"{name}.yaml").resolve()
    if not str(resolved).startswith(str(_themes_dir().resolve())):
        raise ValidationError(f"Path traversal detected for name: {name!r}")


def _atomic_write(target: Path, text: str) -> None:
    """Write text to target atomically via a sibling temp file."""
    dir_ = target.parent
    fd, tmp_path = tempfile.mkstemp(dir=dir_, suffix=".tmp", prefix=".theme_")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(text)
        os.replace(tmp_path, target)
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise
