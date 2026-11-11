"""Regression tests for how Hermes loads and installs the plugin.

Hermes imports the plugin directory as a package (``__init__.py`` executed as
``<pkg>/__init__.py``) without putting the plugin directory itself on
``sys.path``, and it builds the plugin with its declared PEP 517 backend when
syncing plugin dependencies.
"""

import importlib
import subprocess
import sys
import textwrap
import tomllib
from pathlib import Path

PLUGIN_ROOT = Path(__file__).resolve().parent.parent.parent


def test_register_works_when_loaded_as_package(tmp_path):
    # Run in a fresh interpreter so the sys.path tweaks other tests make
    # (inserting the plugin root) cannot mask a broken import.
    script = textwrap.dedent(
        f"""
        import importlib.util, sys
        root = {str(PLUGIN_ROOT)!r}
        assert root not in sys.path
        spec = importlib.util.spec_from_file_location(
            "hermes_plugin_under_test", root + "/__init__.py",
            submodule_search_locations=[root],
        )
        mod = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = mod
        spec.loader.exec_module(mod)

        class Ctx:
            def __init__(self):
                self.tools, self.commands, self.hooks = [], [], []
            def register_tool(self, name, *a, **k): self.tools.append(name)
            def register_command(self, name, *a, **k): self.commands.append(name)
            def register_hook(self, name, *a, **k): self.hooks.append(name)

        ctx = Ctx()
        mod.register(ctx)
        print(len(ctx.tools), ",".join(ctx.commands), len(ctx.hooks))
        """
    )
    result = subprocess.run(
        [sys.executable, "-c", script],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        env={"HERMES_HOME": str(tmp_path), "PATH": ""},
    )
    assert result.returncode == 0, result.stderr
    assert result.stdout.split() == ["5", "theme-editor", "2"]


def test_build_backend_is_importable():
    pyproject = tomllib.loads((PLUGIN_ROOT / "pyproject.toml").read_text())
    backend = pyproject["build-system"]["build-backend"]
    module_name, _, attr = backend.partition(":")
    module = importlib.import_module(module_name)
    if attr:
        getattr(module, attr)
