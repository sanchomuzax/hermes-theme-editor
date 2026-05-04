"""Central configuration for the hermes-theme-editor plugin."""

from pathlib import Path

try:
    from platformdirs import user_data_dir
    _HERMES_HOME = Path(user_data_dir("hermes", roaming=False)).parent / ".hermes"
except ImportError:
    _HERMES_HOME = None

# Respect HERMES_HOME env-override (used by tests and portable installs)
import os as _os
_env_home = _os.environ.get("HERMES_HOME")
if _env_home:
    HERMES_HOME = Path(_env_home)
elif _HERMES_HOME and _HERMES_HOME.exists():
    HERMES_HOME = _HERMES_HOME
else:
    HERMES_HOME = Path.home() / ".hermes"

THEMES_DIR = HERMES_HOME / "dashboard-themes"
GOOGLE_FONTS_CACHE_TTL = 3600  # seconds

PLUGIN_API_PREFIX = "/api/plugins/hermes-theme-editor"

SLUG_RE = r"^[a-z0-9][a-z0-9\-]{0,62}[a-z0-9]$"
SLUG_MAX_LEN = 64

CUSTOM_CSS_MAX = 32 * 1024  # 32 KiB — matches Hermes Agent limit

ALLOWED_FONT_DOMAINS = frozenset(
    [
        "fonts.googleapis.com",
        "fonts.gstatic.com",
        "api.fonts.coollabs.io",  # Bunny Fonts
        "fonts.bunny.net",
        "use.typekit.net",
        "cdn.jsdelivr.net",
        "cdnfonts.com",
        "fonts.cdnfonts.com",
    ]
)
