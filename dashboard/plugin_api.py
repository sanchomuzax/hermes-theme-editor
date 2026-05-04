"""hermes-theme-editor — dashboard plugin backend API.

Mounted at /api/plugins/hermes-theme-editor/ by the Hermes Agent dashboard
plugin system. Provides CRUD endpoints for user themes stored in
~/.hermes/dashboard-themes/.

The frontend calls these endpoints; the Hermes Agent core endpoints
(GET/PUT /api/dashboard/theme[s]) handle listing all themes and setting
the active one.
"""

import sys
from pathlib import Path

# Allow importing from the plugin root (sibling of dashboard/)
_plugin_root = Path(__file__).resolve().parent.parent
if str(_plugin_root) not in sys.path:
    sys.path.insert(0, str(_plugin_root))

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Optional

from themes.repository import list_themes, get_theme, save_theme, delete_theme, theme_exists
from themes.validator import ValidationError

router = APIRouter()


class SaveThemeBody(BaseModel):
    name: str
    label: str
    description: Optional[str] = ""
    palette: Optional[dict[str, Any]] = None
    typography: Optional[dict[str, Any]] = None
    layout: Optional[dict[str, Any]] = None
    layoutVariant: Optional[str] = None
    colorOverrides: Optional[dict[str, str]] = None
    assets: Optional[dict[str, Any]] = None
    componentStyles: Optional[dict[str, Any]] = None
    customCSS: Optional[str] = None


def _body_to_dict(body: SaveThemeBody) -> dict:
    data: dict[str, Any] = {"name": body.name, "label": body.label}
    if body.description:
        data["description"] = body.description
    if body.palette:
        data["palette"] = body.palette
    if body.typography:
        data["typography"] = body.typography
    if body.layout:
        data["layout"] = body.layout
    if body.layoutVariant:
        data["layoutVariant"] = body.layoutVariant
    if body.colorOverrides:
        data["colorOverrides"] = body.colorOverrides
    if body.assets:
        data["assets"] = body.assets
    if body.componentStyles:
        data["componentStyles"] = body.componentStyles
    if body.customCSS is not None:
        data["customCSS"] = body.customCSS
    return data


@router.get("/themes")
async def api_list_themes():
    """List all user themes from ~/.hermes/dashboard-themes/."""
    return {"ok": True, "themes": list_themes()}


@router.get("/themes/{name}")
async def api_get_theme(name: str):
    """Get a single user theme by slug."""
    theme = get_theme(name)
    if theme is None:
        raise HTTPException(status_code=404, detail=f"Theme '{name}' not found")
    return {"ok": True, "theme": theme}


@router.post("/themes")
async def api_create_theme(body: SaveThemeBody):
    """Create a new user theme. Returns 409 if the slug already exists."""
    if theme_exists(body.name):
        raise HTTPException(
            status_code=409,
            detail=f"Theme '{body.name}' already exists. Use PUT to update.",
        )
    try:
        saved = save_theme(_body_to_dict(body))
        return {"ok": True, "theme": saved}
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.put("/themes/{name}")
async def api_update_theme(name: str, body: SaveThemeBody):
    """Update an existing user theme (full replace)."""
    if name != body.name:
        raise HTTPException(
            status_code=422,
            detail="URL name and body name must match",
        )
    try:
        saved = save_theme(_body_to_dict(body))
        return {"ok": True, "theme": saved}
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.delete("/themes/{name}")
async def api_delete_theme(name: str):
    """Delete a user theme by slug."""
    try:
        deleted = delete_theme(name)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Theme '{name}' not found")
    return {"ok": True, "deleted": name}


@router.get("/health")
async def api_health():
    """Plugin health check."""
    return {"ok": True, "plugin": "hermes-theme-editor", "version": "0.1.0"}
