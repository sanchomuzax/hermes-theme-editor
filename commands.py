"""Slash commands and CLI subcommands for the hermes-theme-editor plugin."""

from themes.repository import list_themes, get_theme, save_theme, delete_theme
from themes.validator import ValidationError


def handle_slash_theme_editor(ctx, _args: str) -> None:
    """
    /theme-editor  — print a link to the Theme Editor dashboard tab
    and list user themes.
    """
    themes = list_themes()
    lines = ["**Theme Editor** — open the Hermes dashboard and navigate to the **Themes** tab."]
    if themes:
        lines.append(f"\nUser themes ({len(themes)}):")
        for t in themes:
            lines.append(f"  • **{t.get('label', t.get('name'))}** (`{t.get('name')}`)")
    else:
        lines.append("\nNo user themes yet. Use the Theme Editor tab to create one.")
    ctx.inject_message("\n".join(lines), role="assistant")


def handle_cli_list(_args) -> None:
    themes = list_themes()
    if not themes:
        print("No user themes found in ~/.hermes/dashboard-themes/")
        return
    print(f"User themes ({len(themes)}):")
    for t in themes:
        print(f"  {t.get('name'):<30}  {t.get('label', '')}")


def handle_cli_get(args) -> None:
    name = getattr(args, "name", "")
    theme = get_theme(name)
    if theme is None:
        print(f"Theme '{name}' not found")
        return
    import yaml
    print(yaml.dump(theme, allow_unicode=True, default_flow_style=False, sort_keys=False))


def handle_cli_delete(args) -> None:
    name = getattr(args, "name", "")
    try:
        deleted = delete_theme(name)
        if deleted:
            print(f"Deleted theme '{name}'")
        else:
            print(f"Theme '{name}' not found")
    except ValidationError as e:
        print(f"Error: {e}")
