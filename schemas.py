"""LLM-visible tool schemas for the hermes-theme-editor plugin."""

LIST_THEMES_SCHEMA = {
    "name": "theme_editor_list_themes",
    "description": (
        "List all dashboard themes available in Hermes Agent — "
        "both built-in presets and user-created themes stored in "
        "~/.hermes/dashboard-themes/."
    ),
    "parameters": {
        "type": "object",
        "properties": {},
        "required": [],
    },
}

GET_THEME_SCHEMA = {
    "name": "theme_editor_get_theme",
    "description": (
        "Retrieve the full YAML definition of a user-created dashboard theme by name."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "description": "Theme slug (e.g. 'my-dark-theme').",
            }
        },
        "required": ["name"],
    },
}

SAVE_THEME_SCHEMA = {
    "name": "theme_editor_save_theme",
    "description": (
        "Create or update a user dashboard theme. "
        "The theme is saved as a YAML file in ~/.hermes/dashboard-themes/. "
        "Provide a complete or partial theme definition; missing fields use "
        "Hermes Agent defaults."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "description": "Unique slug (lowercase, hyphens, e.g. 'my-dark-theme').",
            },
            "label": {
                "type": "string",
                "description": "Human-readable display name.",
            },
            "description": {
                "type": "string",
                "description": "Short description shown in the theme picker.",
            },
            "theme_data": {
                "type": "object",
                "description": (
                    "Full or partial theme definition dict. Keys: palette, typography, "
                    "layout, colorOverrides, assets, componentStyles, customCSS, layoutVariant."
                ),
            },
        },
        "required": ["name", "label"],
    },
}

DELETE_THEME_SCHEMA = {
    "name": "theme_editor_delete_theme",
    "description": "Permanently delete a user-created dashboard theme by name.",
    "parameters": {
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "description": "Theme slug to delete.",
            }
        },
        "required": ["name"],
    },
}

OPEN_EDITOR_SCHEMA = {
    "name": "theme_editor_open",
    "description": (
        "Open the visual Theme Editor in the Hermes Agent dashboard. "
        "Returns the dashboard URL for the Theme Editor tab."
    ),
    "parameters": {
        "type": "object",
        "properties": {},
        "required": [],
    },
}
