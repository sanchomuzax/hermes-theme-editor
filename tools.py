"""LLM tool handler implementations for the hermes-theme-editor plugin."""

from themes.repository import list_themes, get_theme, save_theme, delete_theme
from themes.validator import ValidationError


def handle_list_themes(_args: dict) -> dict:
    themes = list_themes()
    return {
        "ok": True,
        "count": len(themes),
        "themes": [
            {"name": t.get("name"), "label": t.get("label"), "description": t.get("description", "")}
            for t in themes
        ],
    }


def handle_get_theme(args: dict) -> dict:
    name = args.get("name", "").strip()
    if not name:
        return {"ok": False, "error": "name is required"}
    theme = get_theme(name)
    if theme is None:
        return {"ok": False, "error": f"Theme '{name}' not found"}
    return {"ok": True, "theme": theme}


def handle_save_theme(args: dict) -> dict:
    name = args.get("name", "").strip()
    label = args.get("label", "").strip()
    description = args.get("description", "")
    theme_data = args.get("theme_data") or {}

    if not isinstance(theme_data, dict):
        return {"ok": False, "error": "theme_data must be a dict"}

    data = {**theme_data, "name": name, "label": label}
    if description:
        data["description"] = description

    try:
        saved = save_theme(data)
        return {"ok": True, "theme": {"name": saved["name"], "label": saved["label"]}}
    except ValidationError as e:
        return {"ok": False, "error": str(e)}


def handle_delete_theme(args: dict) -> dict:
    name = args.get("name", "").strip()
    if not name:
        return {"ok": False, "error": "name is required"}
    try:
        deleted = delete_theme(name)
        if deleted:
            return {"ok": True, "message": f"Theme '{name}' deleted"}
        return {"ok": False, "error": f"Theme '{name}' not found"}
    except ValidationError as e:
        return {"ok": False, "error": str(e)}


def handle_open_editor(_args: dict) -> dict:
    return {
        "ok": True,
        "message": "Open the Hermes Agent dashboard and navigate to the Themes tab.",
        "tab_path": "/themes",
    }
