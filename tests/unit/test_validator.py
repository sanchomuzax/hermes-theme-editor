"""Unit tests for themes/validator.py."""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from themes.validator import (
    validate_slug,
    validate_hex,
    validate_font_url,
    validate_theme_dict,
    ValidationError,
)


class TestValidateSlug:
    def test_valid_slug(self):
        assert validate_slug("my-dark-theme") == "my-dark-theme"

    def test_strips_whitespace(self):
        assert validate_slug("  my-theme  ") == "my-theme"

    def test_rejects_non_string(self):
        with pytest.raises(ValidationError, match="string"):
            validate_slug(42)

    def test_rejects_empty(self):
        with pytest.raises(ValidationError, match="empty"):
            validate_slug("")

    def test_rejects_uppercase(self):
        with pytest.raises(ValidationError):
            validate_slug("MyTheme")

    def test_rejects_spaces(self):
        with pytest.raises(ValidationError):
            validate_slug("my theme")

    def test_rejects_too_long(self):
        with pytest.raises(ValidationError, match="exceeds"):
            validate_slug("a" * 65)

    def test_single_char(self):
        assert validate_slug("a") == "a"

    def test_with_numbers(self):
        assert validate_slug("theme-2026") == "theme-2026"


class TestValidateHex:
    def test_valid_3digit(self):
        assert validate_hex("#fff") == "#fff"

    def test_valid_6digit(self):
        assert validate_hex("#1a2b3c") == "#1a2b3c"

    def test_valid_8digit_alpha(self):
        assert validate_hex("#1a2b3cff") == "#1a2b3cff"

    def test_rejects_no_hash(self):
        with pytest.raises(ValidationError):
            validate_hex("ffffff")

    def test_rejects_invalid_length(self):
        with pytest.raises(ValidationError):
            validate_hex("#12345")

    def test_rejects_non_hex_chars(self):
        with pytest.raises(ValidationError):
            validate_hex("#gggggg")

    def test_rejects_non_string(self):
        with pytest.raises(ValidationError, match="string"):
            validate_hex(None)


class TestValidateFontUrl:
    def test_valid_google_fonts(self):
        url = "https://fonts.googleapis.com/css2?family=Inter&display=swap"
        assert validate_font_url(url) == url

    def test_valid_bunny_fonts(self):
        url = "https://fonts.bunny.net/css?family=inter:400"
        assert validate_font_url(url) == url

    def test_rejects_http(self):
        with pytest.raises(ValidationError, match="https"):
            validate_font_url("http://fonts.googleapis.com/css2?family=Inter")

    def test_rejects_unknown_domain(self):
        with pytest.raises(ValidationError, match="allowed"):
            validate_font_url("https://evil.example.com/font.css")

    def test_empty_string_allowed(self):
        assert validate_font_url("") == ""

    def test_rejects_non_string(self):
        with pytest.raises(ValidationError, match="string"):
            validate_font_url(None)


class TestValidateThemeDict:
    def _minimal(self):
        return {"name": "test-theme", "label": "Test Theme"}

    def test_valid_minimal(self):
        result = validate_theme_dict(self._minimal())
        assert result["name"] == "test-theme"
        assert result["label"] == "Test Theme"

    def test_returns_new_dict(self):
        original = self._minimal()
        result = validate_theme_dict(original)
        assert result is not original

    def test_rejects_missing_name(self):
        with pytest.raises(ValidationError, match="name"):
            validate_theme_dict({"label": "Test"})

    def test_rejects_invalid_color_override_key(self):
        data = {**self._minimal(), "colorOverrides": {"unknownKey": "#fff"}}
        with pytest.raises(ValidationError, match="recogni"):
            validate_theme_dict(data)

    def test_rejects_invalid_density(self):
        data = {**self._minimal(), "layout": {"density": "super-dense"}}
        with pytest.raises(ValidationError, match="density"):
            validate_theme_dict(data)

    def test_rejects_invalid_layout_variant(self):
        data = {**self._minimal(), "layoutVariant": "hologram"}
        with pytest.raises(ValidationError, match="layoutVariant"):
            validate_theme_dict(data)

    def test_accepts_valid_density(self):
        data = {**self._minimal(), "layout": {"density": "compact"}}
        result = validate_theme_dict(data)
        assert result["layout"]["density"] == "compact"

    def test_rejects_oversized_css(self):
        data = {**self._minimal(), "customCSS": "a" * (32 * 1024 + 1)}
        with pytest.raises(ValidationError, match="32"):
            validate_theme_dict(data)

    def test_accepts_valid_palette_hex(self):
        data = {**self._minimal(), "palette": {"background": "#041c1c"}}
        result = validate_theme_dict(data)
        assert result["palette"]["background"] == "#041c1c"

    def test_accepts_valid_palette_layer_dict(self):
        data = {**self._minimal(), "palette": {"background": {"hex": "#041c1c", "alpha": 1.0}}}
        result = validate_theme_dict(data)
        assert result["palette"]["background"]["hex"] == "#041c1c"

    def test_rejects_non_dict(self):
        with pytest.raises(ValidationError, match="dict"):
            validate_theme_dict("not a dict")
