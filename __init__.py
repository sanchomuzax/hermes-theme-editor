"""hermes-theme-editor — Hermes Agent plugin entry point.

Registers tools, slash commands, CLI subcommands, and lifecycle hooks.
The visual UI is served as a native dashboard tab via dashboard/manifest.json
and dashboard/dist/index.js — no separate web server needed.
"""

from schemas import (
    LIST_THEMES_SCHEMA,
    GET_THEME_SCHEMA,
    SAVE_THEME_SCHEMA,
    DELETE_THEME_SCHEMA,
    OPEN_EDITOR_SCHEMA,
)
from plugin_tools import (
    handle_list_themes,
    handle_get_theme,
    handle_save_theme,
    handle_delete_theme,
    handle_open_editor,
)
from commands import (
    handle_slash_theme_editor,
    handle_cli_list,
    handle_cli_get,
    handle_cli_delete,
)
from hooks import on_session_start, on_session_end


def register(ctx) -> None:
    """Wire the plugin into the Hermes Agent plugin context."""

    # ── LLM tools ──────────────────────────────────────────────────────────
    _toolset = "theme-editor"
    ctx.register_tool(LIST_THEMES_SCHEMA["name"], _toolset, LIST_THEMES_SCHEMA, handle_list_themes)
    ctx.register_tool(GET_THEME_SCHEMA["name"], _toolset, GET_THEME_SCHEMA, handle_get_theme)
    ctx.register_tool(SAVE_THEME_SCHEMA["name"], _toolset, SAVE_THEME_SCHEMA, handle_save_theme)
    ctx.register_tool(DELETE_THEME_SCHEMA["name"], _toolset, DELETE_THEME_SCHEMA, handle_delete_theme)
    ctx.register_tool(OPEN_EDITOR_SCHEMA["name"], _toolset, OPEN_EDITOR_SCHEMA, handle_open_editor)

    # ── Slash command ───────────────────────────────────────────────────────
    ctx.register_command("theme-editor", handle_slash_theme_editor)

    # ── CLI subcommands  ────────────────────────────────────────────────────
    try:
        ctx.register_cli_command(
            "theme-editor",
            subcommands={
                "list": (handle_cli_list, "List all user themes"),
                "get": (handle_cli_get, "Print a theme YAML by name"),
                "delete": (handle_cli_delete, "Delete a user theme by name"),
            },
        )
    except (AttributeError, TypeError):
        pass  # register_cli_command may not be available in all versions

    # ── Lifecycle hooks ─────────────────────────────────────────────────────
    ctx.register_hook("on_session_start", on_session_start)
    ctx.register_hook("on_session_end", on_session_end)
