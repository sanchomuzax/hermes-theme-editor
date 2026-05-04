"""Input validation for theme data."""

import re
from typing import Any
from urllib.parse import urlparse

from config import SLUG_RE, SLUG_MAX_LEN, CUSTOM_CSS_MAX, ALLOWED_FONT_DOMAINS

_HEX_RE = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")
_SLUG_RE = re.compile(SLUG_RE)
_RGBA_RE = re.compile(
    r"^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)$"
)

VALID_DENSITIES = {"compact", "comfortable", "spacious"}
VALID_LAYOUT_VARIANTS = {"standard", "cockpit", "tiled"}
VALID_COMPONENT_BUCKETS = {
    "card", "header", "footer", "sidebar", "tab",
    "progress", "badge", "backdrop", "page",
}
VALID_COLOR_OVERRIDE_KEYS = {
    "card", "cardForeground", "popover", "popoverForeground",
    "primary", "primaryForeground", "secondary", "secondaryForeground",
    "muted", "mutedForeground", "accent", "accentForeground",
    "destructive", "destructiveForeground",
    "success", "warning", "border", "input", "ring",
}


class ValidationError(ValueError):
    pass


def validate_slug(value: Any) -> str:
    if not isinstance(value, str):
        raise ValidationError(f"name must be a string, got {type(value).__name__}")
    v = value.strip()
    if not v:
        raise ValidationError("name must not be empty")
    if len(v) > SLUG_MAX_LEN:
        raise ValidationError(f"name exceeds {SLUG_MAX_LEN} characters")
    if not _SLUG_RE.match(v):
        raise ValidationError(
            "name must be lowercase alphanumeric with hyphens, "
            "start and end with a letter or digit, max 64 chars"
        )
    return v


def validate_hex(value: Any, field: str = "color") -> str:
    if not isinstance(value, str):
        raise ValidationError(f"{field} must be a string")
    v = value.strip()
    if not _HEX_RE.match(v):
        raise ValidationError(f"{field}: '{v}' is not a valid hex color (#rgb, #rrggbb, #rrggbbaa)")
    return v


def validate_font_url(value: Any) -> str:
    """Validate a font stylesheet URL against the allowed-domain whitelist."""
    if not isinstance(value, str):
        raise ValidationError("fontUrl must be a string")
    v = value.strip()
    if not v:
        return v
    parsed = urlparse(v)
    if parsed.scheme != "https":
        raise ValidationError("fontUrl must use https://")
    host = parsed.netloc.lower()
    if not any(host == d or host.endswith("." + d) for d in ALLOWED_FONT_DOMAINS):
        raise ValidationError(
            f"fontUrl domain '{host}' is not in the allowed list. "
            f"Allowed: {', '.join(sorted(ALLOWED_FONT_DOMAINS))}"
        )
    return v


def validate_theme_dict(data: dict) -> dict:
    """
    Validate a raw theme dict and return a sanitised copy.
    Raises ValidationError with a descriptive message on failure.
    Does not mutate the input.
    """
    if not isinstance(data, dict):
        raise ValidationError("Theme must be a dict")

    errors: list[str] = []

    def _err(msg: str) -> None:
        errors.append(msg)

    name = data.get("name")
    try:
        name = validate_slug(name)
    except ValidationError as e:
        _err(f"name: {e}")

    label = data.get("label", name)
    if not isinstance(label, str) or not label.strip():
        _err("label must be a non-empty string")

    # palette
    palette = data.get("palette", {})
    if not isinstance(palette, dict):
        _err("palette must be a dict")
        palette = {}

    for layer_key in ("background", "midground", "foreground"):
        layer = palette.get(layer_key)
        if layer is None:
            pass  # optional — defaults applied by Hermes
        elif isinstance(layer, str):
            try:
                validate_hex(layer, f"palette.{layer_key}")
            except ValidationError as e:
                _err(str(e))
        elif isinstance(layer, dict):
            hex_val = layer.get("hex", "")
            try:
                validate_hex(hex_val, f"palette.{layer_key}.hex")
            except ValidationError as e:
                _err(str(e))
            alpha = layer.get("alpha", 1.0)
            try:
                a = float(alpha)
                if not (0.0 <= a <= 1.0):
                    _err(f"palette.{layer_key}.alpha must be 0–1")
            except (TypeError, ValueError):
                _err(f"palette.{layer_key}.alpha must be a number")
        else:
            _err(f"palette.{layer_key} must be a hex string or {{hex, alpha}} dict")

    noise = palette.get("noiseOpacity")
    if noise is not None:
        try:
            n = float(noise)
            if not (0.0 <= n <= 1.2):
                _err("palette.noiseOpacity must be 0–1.2")
        except (TypeError, ValueError):
            _err("palette.noiseOpacity must be a number")

    # typography.fontUrl
    typo = data.get("typography", {})
    if isinstance(typo, dict):
        font_url = typo.get("fontUrl")
        if font_url is not None:
            try:
                validate_font_url(font_url)
            except ValidationError as e:
                _err(f"typography.fontUrl: {e}")

    # colorOverrides — only known keys, string values
    overrides = data.get("colorOverrides", {})
    if overrides and isinstance(overrides, dict):
        for key in overrides:
            if key not in VALID_COLOR_OVERRIDE_KEYS:
                _err(f"colorOverrides.{key} is not a recognised key")

    # customCSS length cap
    css = data.get("customCSS")
    if css is not None and isinstance(css, str) and len(css) > CUSTOM_CSS_MAX:
        _err(f"customCSS exceeds {CUSTOM_CSS_MAX} byte limit")

    # layout.density
    layout = data.get("layout", {})
    if isinstance(layout, dict):
        density = layout.get("density")
        if density is not None and density not in VALID_DENSITIES:
            _err(f"layout.density must be one of {sorted(VALID_DENSITIES)}")

    # layoutVariant
    lv = data.get("layoutVariant")
    if lv is not None and lv not in VALID_LAYOUT_VARIANTS:
        _err(f"layoutVariant must be one of {sorted(VALID_LAYOUT_VARIANTS)}")

    if errors:
        raise ValidationError("; ".join(errors))

    return {**data, "name": name, "label": label}
