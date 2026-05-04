"""Lifecycle hook handlers for the hermes-theme-editor plugin."""

import logging

_log = logging.getLogger("hermes.plugin.theme-editor")


def on_session_start(ctx) -> None:
    """Log that the Theme Editor plugin is active."""
    _log.debug("hermes-theme-editor: session started — Theme Editor tab available in dashboard")


def on_session_end(ctx) -> None:
    """Clean-up hook (no-op for this plugin — no background server to stop)."""
    _log.debug("hermes-theme-editor: session ended")
