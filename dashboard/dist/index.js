/**
 * Hermes Theme Editor — Dashboard Plugin v0.4.1
 *
 * A visual editor for Hermes Agent dashboard themes.
 * Built-in themes can only be cloned. User themes (e.g. anthropic-claude)
 * are fully editable — every property in the YAML, presented without CSS
 * knowledge required, with a live mini-preview that updates as you type.
 *
 * Layout: [Theme List] | [Editor] | [Live Preview]
 *
 * API used:
 *   GET  /api/dashboard/themes                             list all + active
 *   PUT  /api/dashboard/theme                             set active { name }
 *   GET  /api/plugins/hermes-theme-editor/themes          user themes (full YAML)
 *   POST /api/plugins/hermes-theme-editor/themes          create
 *   PUT  /api/plugins/hermes-theme-editor/themes/:name   update
 *   DELETE /api/plugins/hermes-theme-editor/themes/:name delete
 */
(function () {
  "use strict";

  const SDK = window.__HERMES_PLUGIN_SDK__;
  if (!SDK) { console.error("[theme-editor] SDK not found"); return; }

  const { React, hooks, fetchJSON } = SDK;
  const { useState, useEffect, useCallback, useRef, useMemo } = hooks;
  const { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Label } = SDK.components;
  const { cn } = SDK.utils;
  const h = React.createElement;

  // ── Built-in theme names (cannot be edited, only cloned) ─────────────────
  const BUILTIN_NAMES = new Set(["default", "midnight", "ember", "mono", "cyberpunk", "rose"]);

  // ── Popular open-source fonts ─────────────────────────────────────────────
  const FONTS = [
    { name: "System default",  url: "", stack: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
    { name: "Inter",           url: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",          stack: '"Inter", system-ui, sans-serif' },
    { name: "Roboto",          url: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap",             stack: '"Roboto", system-ui, sans-serif' },
    { name: "Lato",            url: "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap",                   stack: '"Lato", system-ui, sans-serif' },
    { name: "Poppins",         url: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap",        stack: '"Poppins", system-ui, sans-serif' },
    { name: "Open Sans",       url: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap",          stack: '"Open Sans", system-ui, sans-serif' },
    { name: "Nunito",          url: "https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap",             stack: '"Nunito", system-ui, sans-serif' },
    { name: "Montserrat",      url: "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;700&display=swap",         stack: '"Montserrat", system-ui, sans-serif' },
    { name: "DM Sans",         url: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&display=swap",            stack: '"DM Sans", system-ui, sans-serif' },
    { name: "Manrope",         url: "https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;700&display=swap",            stack: '"Manrope", system-ui, sans-serif' },
    { name: "Work Sans",       url: "https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;700&display=swap",          stack: '"Work Sans", system-ui, sans-serif' },
    { name: "Ubuntu",          url: "https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap",             stack: '"Ubuntu", system-ui, sans-serif' },
    { name: "Quicksand",       url: "https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;700&display=swap",          stack: '"Quicksand", system-ui, sans-serif' },
    { name: "Raleway",         url: "https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;700&display=swap",            stack: '"Raleway", system-ui, sans-serif' },
    { name: "Playfair Display",url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;700&display=swap",       stack: '"Playfair Display", Georgia, serif' },
    { name: "Merriweather",    url: "https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap",           stack: '"Merriweather", Georgia, serif' },
    { name: "IBM Plex Sans",   url: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;700&display=swap",      stack: '"IBM Plex Sans", system-ui, sans-serif' },
    { name: "Source Sans 3",   url: "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600;700&display=swap",      stack: '"Source Sans 3", system-ui, sans-serif' },
    { name: "JetBrains Mono",  url: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap",         stack: '"JetBrains Mono", ui-monospace, monospace' },
    { name: "Fira Code",       url: "https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;700&display=swap",          stack: '"Fira Code", ui-monospace, monospace' },
    { name: "IBM Plex Mono",   url: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Mono:wght@300;400;500;700&display=swap", stack: '"IBM Plex Mono", ui-monospace, monospace' },
  ];

  const MONO_FONTS = FONTS.filter(f => f.stack.includes("monospace") || f.stack.includes("Mono") || f.stack.includes("Code"));
  const SANS_FONTS = FONTS.filter(f => !f.stack.includes("monospace"));

  // ── Colour override labels (user-friendly) ────────────────────────────────
  const OVERRIDE_META = [
    { key: "primary",              label: "Primary action colour",    hint: "Buttons, active links, focus rings" },
    { key: "primaryForeground",    label: "Primary button text",      hint: "Text on primary-coloured buttons" },
    { key: "accent",               label: "Accent / highlight",       hint: "Secondary highlights and hover states" },
    { key: "accentForeground",     label: "Accent text",              hint: "Text on accent-coloured surfaces" },
    { key: "muted",                label: "Muted surface",            hint: "Quiet background panels" },
    { key: "mutedForeground",      label: "Subtle text",              hint: "Placeholders, secondary labels" },
    { key: "card",                 label: "Card background",          hint: "Message cards and panels" },
    { key: "cardForeground",       label: "Card text",                hint: "Text inside cards" },
    { key: "destructive",          label: "Danger / delete colour",   hint: "Delete buttons, error states" },
    { key: "destructiveForeground",label: "Danger text",              hint: "Text on danger-coloured surfaces" },
    { key: "success",              label: "Success colour",           hint: "Confirmations, connected state" },
    { key: "warning",              label: "Warning colour",           hint: "Warnings, rate-limit notices" },
    { key: "border",               label: "Border colour",            hint: "Card and panel borders" },
    { key: "input",                label: "Input field border",       hint: "Text field outlines" },
    { key: "ring",                 label: "Focus ring colour",        hint: "Keyboard-focus indicator" },
    { key: "popover",              label: "Popover background",       hint: "Dropdown menus, tooltips" },
    { key: "popoverForeground",    label: "Popover text",             hint: "Text inside dropdowns" },
  ];

  // ── Utility helpers ───────────────────────────────────────────────────────

  function hexToRgb(hex) {
    if (!hex || typeof hex !== "string") return [80, 80, 80];
    const h = hex.replace("#", "");
    if (h.length === 3) {
      return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
    }
    if (h.length >= 6) {
      return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
    }
    return [80, 80, 80];
  }

  function resolveHex(val) {
    if (!val) return "#000000";
    if (typeof val === "string") {
      if (val.startsWith("#")) return val;
      // Extract hex from rgba(...) / rgb(...)
      const m = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (m) return "#" + [m[1], m[2], m[3]].map(x => parseInt(x).toString(16).padStart(2, "0")).join("");
      return "#000000";
    }
    if (val && val.hex) return val.hex;
    return "#000000";
  }

  function parsePx(str) {
    return parseFloat(str) || 15;
  }

  function parseRem(str) {
    if (!str) return 0.5;
    const m = str.match(/([\d.]+)rem/);
    return m ? parseFloat(m[1]) : 0.5;
  }

  function parseRgba(str) {
    if (!str) return { r: 217, g: 119, b: 87, a: 0.3 };
    const m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (!m) return { r: 217, g: 119, b: 87, a: 0.3 };
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? parseFloat(m[4]) : 1 };
  }

  function rgbaStr(r, g, b, a) {
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${parseFloat(a).toFixed(2)})`;
  }

  function slugify(str) {
    return str.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"").replace(/^-+|-+$/g,"").slice(0,64);
  }

  function matchFont(fontSans, fontList) {
    if (!fontSans) return fontList[0];
    return fontList.find(f => fontSans.includes(f.name.split(" ")[0])) || { name: "Custom", url: "", stack: fontSans };
  }

  function blendBg(hex, amount) {
    const [r, g, b] = hexToRgb(hex);
    const a = amount > 0 ? Math.min(255, r + amount) : Math.max(0, r + amount);
    const bl = amount > 0 ? Math.min(255, b + amount) : Math.max(0, b + amount);
    const gr = amount > 0 ? Math.min(255, g + amount) : Math.max(0, g + amount);
    return `rgb(${a},${gr},${bl})`;
  }

  // ── Direct DOM theme application (mirrors context.tsx applyTheme) ─────────
  // Called after save when the edited theme is already active, so the user
  // sees changes immediately without a page reload.
  function applyThemeToDom(data) {
    const root = document.documentElement;
    const DENSITY = { compact: "0.85", comfortable: "1", spacious: "1.2" };
    const OVERRIDE_VARS = {
      card: "--color-card", cardForeground: "--color-card-foreground",
      popover: "--color-popover", popoverForeground: "--color-popover-foreground",
      primary: "--color-primary", primaryForeground: "--color-primary-foreground",
      secondary: "--color-secondary", secondaryForeground: "--color-secondary-foreground",
      muted: "--color-muted", mutedForeground: "--color-muted-foreground",
      accent: "--color-accent", accentForeground: "--color-accent-foreground",
      destructive: "--color-destructive", destructiveForeground: "--color-destructive-foreground",
      success: "--color-success", warning: "--color-warning",
      border: "--color-border", input: "--color-input", ring: "--color-ring",
    };

    function parseLayer(val, dHex, dAlpha = 1) {
      if (!val) return { hex: dHex, alpha: dAlpha };
      if (typeof val === "string") return { hex: val, alpha: dAlpha };
      return { hex: val.hex || dHex, alpha: val.alpha !== undefined ? val.alpha : dAlpha };
    }
    function setLayer(name, layer) {
      const pct = Math.round(layer.alpha * 100);
      root.style.setProperty(`--${name}`, `color-mix(in srgb, ${layer.hex} ${pct}%, transparent)`);
      root.style.setProperty(`--${name}-base`, layer.hex);
      root.style.setProperty(`--${name}-alpha`, String(layer.alpha));
    }

    const p = data.palette || {};
    setLayer("background", parseLayer(p.background, "#041c1c"));
    setLayer("midground",  parseLayer(p.midground,  "#ffe6cb"));
    setLayer("foreground", parseLayer(p.foreground, "#ffffff", 0));
    if (p.warmGlow) root.style.setProperty("--warm-glow", p.warmGlow);
    root.style.setProperty("--noise-opacity-mul", String(p.noiseOpacity !== undefined ? p.noiseOpacity : 1));

    const t = data.typography || {};
    if (t.fontSans)       root.style.setProperty("--theme-font-sans", t.fontSans);
    if (t.fontMono)       root.style.setProperty("--theme-font-mono", t.fontMono);
    if (t.fontDisplay)    root.style.setProperty("--theme-font-display", t.fontDisplay);
    if (t.baseSize)       root.style.setProperty("--theme-base-size", t.baseSize);
    if (t.lineHeight)     root.style.setProperty("--theme-line-height", t.lineHeight);
    if (t.letterSpacing)  root.style.setProperty("--theme-letter-spacing", t.letterSpacing);

    const l = data.layout || {};
    if (l.radius) {
      root.style.setProperty("--radius", l.radius);
      root.style.setProperty("--theme-radius", l.radius);
    }
    if (l.density) {
      root.style.setProperty("--theme-spacing-mul", DENSITY[l.density] || "1");
      root.style.setProperty("--theme-density", l.density);
    }

    const ov = data.colorOverrides || {};
    for (const [key, varName] of Object.entries(OVERRIDE_VARS)) {
      if (ov[key]) root.style.setProperty(varName, ov[key]);
      else root.style.removeProperty(varName);
    }

    const toKebab = s => s.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
    const BUCKETS = ["card","header","footer","sidebar","tab","progress","badge","backdrop","page"];
    const cs = data.componentStyles || {};
    for (const bucket of BUCKETS) {
      const props = cs[bucket];
      if (!props) continue;
      for (const [prop, value] of Object.entries(props)) {
        if (typeof value === "string" && value.trim())
          root.style.setProperty(`--component-${bucket}-${toKebab(prop)}`, value);
      }
    }

    const assets = data.assets || {};
    if (assets.bg && assets.bg.trim()) {
      const bg = assets.bg.trim();
      const wrapped = /^(url\(|linear-gradient|radial-gradient|conic-gradient|none$)/i.test(bg) ? bg : `url("${bg}")`;
      root.style.setProperty("--theme-asset-bg", wrapped);
      root.style.setProperty("--theme-asset-bg-raw", bg);
    } else {
      root.style.removeProperty("--theme-asset-bg");
      root.style.removeProperty("--theme-asset-bg-raw");
    }

    if (data.layoutVariant) {
      root.dataset.layoutVariant = data.layoutVariant;
      root.style.setProperty("--theme-layout-variant", data.layoutVariant);
    }

    if (t.fontUrl) {
      const existing = document.querySelector(`link[href="${t.fontUrl}"]`);
      if (!existing) {
        const link = document.createElement("link");
        link.rel = "stylesheet"; link.href = t.fontUrl;
        link.setAttribute("data-hermes-theme-font", "true");
        document.head.appendChild(link);
      }
    }

    const styleId = "hermes-theme-custom-css";
    let styleEl = document.getElementById(styleId);
    if (data.customCSS && data.customCSS.trim()) {
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = styleId;
        styleEl.setAttribute("data-hermes-theme-css", "true");
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = data.customCSS;
    } else if (styleEl) {
      styleEl.remove();
    }

    root.setAttribute("data-theme", data.name || "");
  }

  // ── Default empty theme ───────────────────────────────────────────────────
  function emptyTheme(name, label) {
    return {
      name: name || "",
      label: label || "",
      description: "",
      palette: {
        background: "#0f172a",
        midground: "#e2e8f0",
        foreground: { hex: "#ffffff", alpha: 0 },
        warmGlow: "rgba(99, 102, 241, 0.25)",
        noiseOpacity: 0.8,
      },
      typography: {
        fontSans: '"Inter", system-ui, sans-serif',
        fontMono: '"JetBrains Mono", ui-monospace, monospace',
        fontDisplay: "",
        fontUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
        baseSize: "15px",
        lineHeight: "1.6",
        letterSpacing: "0",
      },
      layout: { radius: "0.5rem", density: "comfortable" },
      layoutVariant: "standard",
      colorOverrides: {
        primary: "#6366f1",
        primaryForeground: "#ffffff",
        accent: "#a78bfa",
        accentForeground: "#1e1b4b",
        success: "#22c55e",
        warning: "#f59e0b",
        destructive: "#ef4444",
        border: "rgba(255,255,255,0.1)",
      },
      assets: { bg: "" },
      componentStyles: {},
      customCSS: "",
    };
  }

  // ── Live preview component ────────────────────────────────────────────────
  function LivePreview({ theme }) {
    const bg = resolveHex(theme.palette && theme.palette.background);
    const mid = resolveHex(theme.palette && theme.palette.midground);
    const ov = theme.colorOverrides || {};
    const primary = ov.primary || "#6366f1";
    const accent = ov.accent || "#a78bfa";
    const border = ov.border || "rgba(255,255,255,0.1)";
    const success = ov.success || "#22c55e";
    const muted = ov.mutedForeground || mid;
    const radius = theme.layout ? theme.layout.radius || "0.5rem" : "0.5rem";
    const fontFamily = (theme.typography && theme.typography.fontSans) || "system-ui, sans-serif";
    const lineHeight = (theme.typography && theme.typography.lineHeight) || "1.6";

    const cs = theme.componentStyles || {};
    const headerBg = (cs.header && cs.header.background) || blendBg(bg, 8);
    const sidebarBg = (cs.sidebar && cs.sidebar.background) || blendBg(bg, 5);
    const cardBg = (cs.card && cs.card.background) || "rgba(255,255,255,0.03)";
    const cardShadow = (cs.card && cs.card.boxShadow) || "none";

    const [pR, pG, pB] = hexToRgb(primary);
    const [aR, aG, aB] = hexToRgb(accent);

    // Inject font link if needed
    const fontUrl = theme.typography && theme.typography.fontUrl;
    const linkId = "hte-preview-font";
    if (fontUrl) {
      let link = document.getElementById(linkId);
      if (!link) {
        link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
      if (link.href !== fontUrl) link.href = fontUrl;
    }

    // Scale text sizes proportionally so font-size changes are visible
    const basePx   = parsePx(theme.typography && theme.typography.baseSize);
    const scale    = Math.max(0.7, Math.min(1.3, basePx / 15));
    const pxBase   = Math.round(10 * scale) + "px";
    const pxSmall  = Math.round(8.5 * scale) + "px";
    const pxTiny   = Math.round(7.5 * scale) + "px";

    const S = { // shared style fragments — sizes scale with baseSize
      text:  { color: mid,   fontFamily, fontSize: pxBase,  lineHeight },
      muted: { color: muted, fontFamily, fontSize: pxSmall, lineHeight },
      tiny:  { color: muted, fontFamily, fontSize: pxTiny,  lineHeight },
    };

    return h("div", {
      style: {
        display: "flex", flexDirection: "column", borderRadius: radius,
        overflow: "hidden", border: `1px solid ${border}`,
        background: bg, fontFamily,
      }
    },
      // Header
      h("div", {
        style: {
          height: "36px", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 10px", background: headerBg,
          borderBottom: `1px solid ${border}`,
        }
      },
        h("div", { style: { display: "flex", alignItems: "center", gap: "6px" } },
          h("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: success } }),
          h("span", { style: { ...S.muted, fontWeight: 600 } }, "Hermes Agent"),
        ),
        h("span", { style: { ...S.tiny } }, "◐ Theme Editor"),
      ),

      // Body: sidebar + main
      h("div", { style: { display: "flex", flex: 1, overflow: "hidden" } },

        // Sidebar
        h("div", {
          style: {
            width: "42px", background: sidebarBg,
            borderRight: `1px solid ${border}`,
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "8px 0", gap: "6px",
          }
        },
          ...["💬","📋","⚙","🔑","▶"].map((icon, i) =>
            h("div", {
              key: i,
              style: {
                width: "30px", height: "30px", display: "flex", alignItems: "center",
                justifyContent: "center", borderRadius: "6px", fontSize: "13px",
                background: i === 0 ? `rgba(${pR},${pG},${pB},0.15)` : "transparent",
                cursor: "default",
              }
            }, icon)
          )
        ),

        // Chat area
        h("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" } },
          h("div", { style: { flex: 1, padding: "10px", display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden" } },

            // Assistant message
            h("div", {
              style: {
                background: cardBg, boxShadow: cardShadow,
                borderLeft: `3px solid ${accent}`,
                borderRadius: radius, padding: "7px 10px",
              }
            },
              h("div", { style: { ...S.tiny, marginBottom: "3px" } }, "✦ Assistant"),
              h("div", { style: { ...S.text } }, "Hello! How can I help you today?"),
            ),

            // User message
            h("div", {
              style: {
                background: `rgba(${pR},${pG},${pB},0.1)`,
                borderLeft: `3px solid ${primary}`,
                borderRadius: radius, padding: "7px 10px", marginLeft: "12px",
              }
            },
              h("div", { style: { ...S.tiny, marginBottom: "3px" } }, "You"),
              h("div", { style: { ...S.text } }, "Tell me about this theme."),
            ),

            // Tool call
            h("div", {
              style: {
                background: `rgba(${aR},${aG},${aB},0.07)`,
                border: `1px solid rgba(${aR},${aG},${aB},0.2)`,
                borderRadius: radius, padding: "5px 8px",
              }
            },
              h("div", { style: { ...S.tiny } }, "⚡ theme_editor_get_theme"),
            ),

            // Button row
            h("div", { style: { display: "flex", gap: "6px", marginTop: "2px" } },
              h("div", {
                style: {
                  background: primary, color: "#fff",
                  borderRadius: radius, padding: "3px 8px",
                  fontSize: pxTiny, fontWeight: 600,
                }
              }, "Save"),
              h("div", {
                style: {
                  background: "transparent",
                  border: `1px solid ${border}`, color: muted,
                  borderRadius: radius, padding: "3px 8px", fontSize: pxTiny,
                }
              }, "Cancel"),
            ),
          ),

          // Input bar — compact, not distracting
          h("div", {
            style: {
              padding: "5px 8px",
              borderTop: `1px solid ${border}`,
              display: "flex", alignItems: "center", gap: "6px",
            }
          },
            h("div", {
              style: {
                flex: 1,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${border}`, borderRadius: radius,
                padding: "3px 8px", fontSize: pxTiny, color: "rgba(255,255,255,0.25)",
              }
            }, "Type a message…"),
            h("div", {
              style: {
                width: "20px", height: "20px", borderRadius: radius,
                background: primary, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: pxTiny, color: "#fff",
                flexShrink: 0,
              }
            }, "↑"),
          ),
        ),
      ),
    );
  }

  // ── Field components ──────────────────────────────────────────────────────

  function Section({ title, children, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);
    return h("div", { className: "mb-2" },
      h("button", {
        type: "button",
        onClick: () => setOpen(o => !o),
        className: "w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/30 transition-colors text-left",
      },
        h("span", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground" }, title),
        h("span", { className: "text-muted-foreground text-xs" }, open ? "▲" : "▼"),
      ),
      open && h("div", { className: "px-1 pb-2 flex flex-col gap-3" }, children),
    );
  }

  function FieldRow({ label, hint, children }) {
    return h("div", { className: "flex flex-col gap-1" },
      h("div", { className: "flex items-baseline gap-1" },
        h("label", { className: "text-xs font-medium" }, label),
        hint && h("span", { className: "text-xs text-muted-foreground" }, "— " + hint),
      ),
      children,
    );
  }

  function ColorField({ label, hint, value, onChange }) {
    const hex = resolveHex(value);
    const isObj = value && typeof value === "object";
    const alpha = isObj ? (value.alpha !== undefined ? value.alpha : 1) : undefined;

    function onHex(e) {
      onChange(isObj ? { hex: e.target.value, alpha } : e.target.value);
    }
    function onAlpha(e) {
      onChange({ hex, alpha: parseFloat(e.target.value) });
    }

    return h(FieldRow, { label, hint },
      h("div", { className: "flex items-center gap-2" },
        h("input", {
          type: "color",
          value: hex.length === 7 ? hex : "#000000",
          onChange: onHex,
          style: { width: "36px", height: "36px", padding: "2px", border: "1px solid var(--color-border)", borderRadius: "6px", cursor: "pointer", background: "transparent" },
        }),
        h(Input, {
          value: hex,
          onChange: onHex,
          className: "flex-1 font-mono text-xs h-9",
          placeholder: "#000000",
          maxLength: 9,
        }),
        isObj && h("div", { className: "flex flex-col gap-0.5 w-24" },
          h("span", { className: "text-xs text-muted-foreground" }, "Opacity " + Math.round((alpha || 0) * 100) + "%"),
          h("input", {
            type: "range", min: 0, max: 1, step: 0.01,
            value: alpha || 0,
            onChange: onAlpha,
            style: { width: "100%", accentColor: "var(--color-primary)" },
          }),
        ),
      ),
    );
  }

  function GlowField({ label, hint, value, onChange }) {
    const { r, g, b, a } = parseRgba(value || "rgba(99,102,241,0.25)");
    const hex = "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");

    function onHex(e) {
      const [nr, ng, nb] = hexToRgb(e.target.value);
      onChange(rgbaStr(nr, ng, nb, a));
    }
    function onAlpha(e) {
      onChange(rgbaStr(r, g, b, e.target.value));
    }

    return h(FieldRow, { label, hint },
      h("div", { className: "flex items-center gap-2" },
        h("input", {
          type: "color", value: hex,
          onChange: onHex,
          style: { width: "36px", height: "36px", padding: "2px", border: "1px solid var(--color-border)", borderRadius: "6px", cursor: "pointer", background: "transparent" },
        }),
        h("div", { className: "flex flex-col gap-0.5 flex-1" },
          h("span", { className: "text-xs text-muted-foreground" }, "Intensity " + Math.round(a * 100) + "%"),
          h("input", {
            type: "range", min: 0, max: 1, step: 0.01,
            value: a,
            onChange: onAlpha,
            style: { width: "100%", accentColor: "var(--color-primary)" },
          }),
        ),
      ),
    );
  }

  function SliderField({ label, hint, value, onChange, min, max, step, unit, format }) {
    const numVal = parseFloat(value) || 0;
    const display = format ? format(numVal) : (numVal + (unit || ""));
    return h(FieldRow, { label, hint },
      h("div", { className: "flex items-center gap-3" },
        h("input", {
          type: "range", min, max, step,
          value: numVal,
          onChange: e => onChange(e.target.value),
          style: { flex: 1, accentColor: "var(--color-primary)" },
        }),
        h("span", { className: "text-xs font-mono w-16 text-right" }, display),
      ),
    );
  }

  function FontPicker({ label, hint, value, onChange, onUrlChange, urlValue, fontList }) {
    const list = fontList || SANS_FONTS;
    const matched = matchFont(value, list);
    const isCustom = !list.find(f => f.name === matched.name);
    const [customMode, setCustomMode] = useState(isCustom);

    function pick(font) {
      onChange(font.stack);
      if (onUrlChange) onUrlChange(font.url);
      setCustomMode(false);
    }

    return h(FieldRow, { label, hint },
      h("div", { className: "flex flex-col gap-2" },
        h("select", {
          value: customMode ? "__custom__" : (matched.name || ""),
          onChange: e => {
            if (e.target.value === "__custom__") {
              setCustomMode(true);
            } else {
              const f = list.find(x => x.name === e.target.value);
              if (f) pick(f);
            }
          },
          className: "text-sm h-9 rounded-md border border-input bg-background px-3 w-full",
          style: { fontFamily: customMode ? "inherit" : matched.stack },
        },
          list.map(f => h("option", { key: f.name, value: f.name, style: { fontFamily: f.stack } }, f.name)),
          h("option", { value: "__custom__" }, "Custom font stack…"),
        ),
        customMode && h(Input, {
          value: value || "",
          onChange: e => onChange(e.target.value),
          placeholder: '"My Font", system-ui, sans-serif',
          className: "text-xs font-mono h-9",
        }),
        onUrlChange && h("div", { className: "flex flex-col gap-1" },
          h("span", { className: "text-xs text-muted-foreground" }, "Stylesheet URL (Google Fonts, Bunny Fonts, etc.)"),
          h(Input, {
            value: urlValue || "",
            onChange: e => onUrlChange(e.target.value),
            placeholder: "https://fonts.googleapis.com/css2?family=…",
            className: "text-xs font-mono h-9",
          }),
        ),
      ),
    );
  }

  function TextareaField({ label, hint, value, onChange, placeholder, rows }) {
    return h(FieldRow, { label, hint },
      h("textarea", {
        value: value || "",
        onChange: e => onChange(e.target.value),
        rows: rows || 5,
        placeholder: placeholder || "",
        className: "w-full text-xs font-mono rounded-md border border-input bg-background px-3 py-2 resize-y",
      }),
    );
  }

  function RadioGroup({ label, hint, value, onChange, options }) {
    return h(FieldRow, { label, hint },
      h("div", { className: "flex gap-2 flex-wrap" },
        options.map(opt =>
          h("button", {
            key: opt.value,
            type: "button",
            onClick: () => onChange(opt.value),
            className: cn(
              "text-xs px-3 py-1.5 rounded-md border transition-colors",
              value === opt.value
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border hover:bg-muted/30",
            ),
          }, opt.label)
        )
      ),
    );
  }

  // ── Theme editor form ─────────────────────────────────────────────────────
  function ThemeForm({ theme, isNew, onUpdate }) {
    const readOnly = !isNew && BUILTIN_NAMES.has(theme.name);

    function set(path, value) {
      const parts = path.split(".");
      onUpdate(prev => {
        const next = { ...prev };
        let cur = next;
        for (let i = 0; i < parts.length - 1; i++) {
          cur[parts[i]] = { ...cur[parts[i]] };
          cur = cur[parts[i]];
        }
        cur[parts[parts.length - 1]] = value;
        return next;
      });
    }

    function setOverride(key, val) {
      onUpdate(prev => ({
        ...prev,
        colorOverrides: { ...prev.colorOverrides, [key]: val },
      }));
    }

    function setCompStyle(bucket, prop, val) {
      onUpdate(prev => ({
        ...prev,
        componentStyles: {
          ...prev.componentStyles,
          [bucket]: { ...(prev.componentStyles || {})[bucket], [prop]: val },
        },
      }));
    }

    const p = theme.palette || {};
    const t = theme.typography || {};
    const l = theme.layout || {};
    const ov = theme.colorOverrides || {};
    const cs = theme.componentStyles || {};
    const assets = theme.assets || {};

    const basePx = parsePx(t.baseSize || "15px");
    const lineH = parseFloat(t.lineHeight || "1.6");
    const remRadius = parseRem(l.radius || "0.5rem");
    const lsVal = parseFloat(t.letterSpacing || "0") * 100;

    return h("div", { className: "flex flex-col gap-1 overflow-y-auto" },

      // Name / Label (only for user/new themes)
      !readOnly && h(Section, { title: "Theme identity" },
        h(FieldRow, { label: "Display name", hint: "Shown in the theme picker" },
          h(Input, {
            value: theme.label || "",
            onChange: e => { set("label", e.target.value); if (isNew) set("name", slugify(e.target.value)); },
            placeholder: "My Dark Theme",
            className: "text-sm h-9",
          }),
        ),
        isNew && h(FieldRow, { label: "ID (slug)", hint: "Filename — auto-generated, no spaces" },
          h(Input, {
            value: theme.name || "",
            onChange: e => set("name", slugify(e.target.value)),
            placeholder: "my-dark-theme",
            className: "font-mono text-xs h-9",
          }),
        ),
        h(FieldRow, { label: "Description", hint: "Optional — shown in the theme picker" },
          h(Input, {
            value: theme.description || "",
            onChange: e => set("description", e.target.value),
            placeholder: "Short description…",
            className: "text-sm h-9",
          }),
        ),
      ),

      // Base palette
      h(Section, { title: "Base colours (3-layer palette)" },
        h(ColorField, {
          label: "Page background", hint: "Darkest base — the canvas behind everything",
          value: p.background,
          onChange: v => set("palette.background", v),
        }),
        h(ColorField, {
          label: "Content colour", hint: "Primary text and most UI chrome derive from this",
          value: p.midground,
          onChange: v => set("palette.midground", v),
        }),
        h(ColorField, {
          label: "Highlight layer", hint: "Top-layer accent (alpha 0 = invisible by default)",
          value: p.foreground || { hex: "#ffffff", alpha: 0 },
          onChange: v => set("palette.foreground", v),
        }),
        h(GlowField, {
          label: "Atmosphere glow", hint: "Warm vignette colour in the background",
          value: p.warmGlow,
          onChange: v => set("palette.warmGlow", v),
        }),
        h(SliderField, {
          label: "Texture / noise intensity", hint: "Film-grain overlay strength",
          value: p.noiseOpacity !== undefined ? p.noiseOpacity : 1,
          onChange: v => set("palette.noiseOpacity", parseFloat(v)),
          min: 0, max: 1.2, step: 0.05,
          format: v => Math.round(v * 100) + "%",
        }),
      ),

      // UI colour overrides
      h(Section, { title: "UI colours" },
        ...OVERRIDE_META.map(meta =>
          h(ColorField, {
            key: meta.key,
            label: meta.label, hint: meta.hint,
            value: ov[meta.key] || "",
            onChange: v => setOverride(meta.key, v),
          })
        ),
      ),

      // Typography
      h(Section, { title: "Typography" },
        h(FontPicker, {
          label: "Body / UI font", hint: "Used for most text in the dashboard",
          value: t.fontSans, fontList: SANS_FONTS,
          onChange: v => set("typography.fontSans", v),
          onUrlChange: v => set("typography.fontUrl", v),
          urlValue: t.fontUrl,
        }),
        h(FontPicker, {
          label: "Code / monospace font", hint: "Used in code blocks and terminal output",
          value: t.fontMono, fontList: MONO_FONTS,
          onChange: v => set("typography.fontMono", v),
        }),
        h(FontPicker, {
          label: "Heading / display font", hint: "Optional — falls back to body font if empty",
          value: t.fontDisplay, fontList: SANS_FONTS,
          onChange: v => set("typography.fontDisplay", v),
        }),
        h(SliderField, {
          label: "Text size", hint: "Base font size in px",
          value: basePx,
          onChange: v => set("typography.baseSize", v + "px"),
          min: 12, max: 20, step: 1, unit: "px",
        }),
        h(SliderField, {
          label: "Line spacing", hint: "Vertical space between lines",
          value: lineH,
          onChange: v => set("typography.lineHeight", String(parseFloat(v).toFixed(2))),
          min: 1.2, max: 2.2, step: 0.05,
          format: v => parseFloat(v).toFixed(2) + "×",
        }),
        h(SliderField, {
          label: "Letter spacing", hint: "Horizontal space between characters",
          value: lsVal,
          onChange: v => set("typography.letterSpacing", parseFloat(v) === 0 ? "0" : (parseFloat(v) / 100).toFixed(3) + "em"),
          min: -5, max: 10, step: 0.5,
          format: v => (parseFloat(v) >= 0 ? "+" : "") + parseFloat(v) + " units",
        }),
      ),

      // Layout
      h(Section, { title: "Layout & spacing" },
        h(SliderField, {
          label: "Corner roundness", hint: "Border radius applied to all UI elements",
          value: remRadius,
          onChange: v => set("layout.radius", parseFloat(v).toFixed(3) + "rem"),
          min: 0, max: 1.5, step: 0.025,
          format: v => parseFloat(v).toFixed(2) + " rem",
        }),
        h(RadioGroup, {
          label: "Spacing density", hint: "Controls padding throughout the UI",
          value: l.density || "comfortable",
          onChange: v => set("layout.density", v),
          options: [
            { value: "compact",     label: "Compact — tight" },
            { value: "comfortable", label: "Comfortable — default" },
            { value: "spacious",    label: "Spacious — relaxed" },
          ],
        }),
        h(RadioGroup, {
          label: "Dashboard layout variant",
          value: theme.layoutVariant || "standard",
          onChange: v => set("layoutVariant", v),
          options: [
            { value: "standard", label: "Standard" },
            { value: "cockpit",  label: "Cockpit — sidebar rail" },
            { value: "tiled",    label: "Tiled — full width" },
          ],
        }),
      ),

      // Component styles
      h(Section, { title: "Component styling", defaultOpen: false },
        h(FieldRow, { label: "Card background", hint: "Background CSS value (colour, gradient, etc.)" },
          h(Input, {
            value: (cs.card && cs.card.background) || "",
            onChange: e => setCompStyle("card", "background", e.target.value),
            placeholder: "rgba(255,255,255,0.03)",
            className: "text-xs font-mono h-9",
          }),
        ),
        h(FieldRow, { label: "Card shadow", hint: "box-shadow CSS value" },
          h(Input, {
            value: (cs.card && cs.card.boxShadow) || "",
            onChange: e => setCompStyle("card", "boxShadow", e.target.value),
            placeholder: "0 4px 16px -4px rgba(0,0,0,0.4)",
            className: "text-xs font-mono h-9",
          }),
        ),
        h(FieldRow, { label: "Header background", hint: "Top navigation bar" },
          h(Input, {
            value: (cs.header && cs.header.background) || "",
            onChange: e => setCompStyle("header", "background", e.target.value),
            placeholder: "rgba(15,23,42,0.98)",
            className: "text-xs font-mono h-9",
          }),
        ),
        h(FieldRow, { label: "Sidebar background", hint: "Left navigation panel" },
          h(Input, {
            value: (cs.sidebar && cs.sidebar.background) || "",
            onChange: e => setCompStyle("sidebar", "background", e.target.value),
            placeholder: "rgba(10,18,35,0.97)",
            className: "text-xs font-mono h-9",
          }),
        ),
      ),

      // Background asset
      h(Section, { title: "Background asset", defaultOpen: false },
        h(FieldRow, { label: "Background image or gradient", hint: "URL or CSS gradient placed behind the UI" },
          h(Input, {
            value: assets.bg || "",
            onChange: e => onUpdate(prev => ({ ...prev, assets: { ...prev.assets, bg: e.target.value } })),
            placeholder: "linear-gradient(165deg, #0f172a 0%, #1e293b 100%)",
            className: "text-xs font-mono h-9",
          }),
        ),
      ),

      // Custom CSS
      h(Section, { title: "Custom CSS (advanced)", defaultOpen: false },
        h("p", { className: "text-xs text-muted-foreground px-1" },
          "Raw CSS injected on theme apply. Scoped to :root[data-theme=\"", theme.name, "\"] in the real dashboard."
        ),
        h(TextareaField, {
          label: "", value: theme.customCSS,
          onChange: v => set("customCSS", v),
          rows: 8,
          placeholder: '/* Example: custom scrollbar */\n:root[data-theme="' + (theme.name || "my-theme") + '"] ::-webkit-scrollbar {\n  width: 8px;\n}\n',
        }),
      ),

    );
  }

  // ── Main page ─────────────────────────────────────────────────────────────
  function ThemeEditorPage() {
    const [allThemes, setAllThemes]   = useState([]);
    const [userThemes, setUserThemes] = useState([]);
    const [activeTheme, setActive]    = useState(null);
    const [editing, setEditing]       = useState(null);  // { data, isNew }
    const [isDirty, setDirty]         = useState(false);
    const [saving, setSaving]         = useState(false);
    const [toast, setToast]           = useState(null);
    const [loading, setLoading]       = useState(true);
    const [hiding, setHiding]         = useState(false);

    function showToast(msg, type = "ok") {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3500);
    }

    async function load() {
      setLoading(true);
      try {
        const [ar, ur] = await Promise.all([
          fetchJSON("/api/dashboard/themes"),
          fetchJSON("/api/plugins/hermes-theme-editor/themes"),
        ]);
        setAllThemes(ar.themes || []);
        setActive(ar.active || null);
        setUserThemes(ur.themes || []);
      } catch (e) {
        showToast("Failed to load themes: " + e.message, "error");
      } finally {
        setLoading(false);
      }
    }

    useEffect(() => { load(); }, []);

    function openEdit(themeData, isNew = false) {
      // Ensure all sub-objects exist so the form never crashes on undefined
      const safe = {
        ...emptyTheme(),
        ...themeData,
        palette: { ...emptyTheme().palette, ...(themeData.palette || {}) },
        typography: { ...emptyTheme().typography, ...(themeData.typography || {}) },
        layout: { ...emptyTheme().layout, ...(themeData.layout || {}) },
        colorOverrides: { ...(themeData.colorOverrides || {}) },
        componentStyles: { ...(themeData.componentStyles || {}) },
        assets: { ...(themeData.assets || {}) },
        customCSS: themeData.customCSS || "",
      };
      setEditing({ data: safe, isNew });
      setDirty(false);
    }

    function openClone(source) {
      const base = userThemes.find(u => u.name === source.name)
        || (source.definition ? source.definition : source);
      const cloned = { ...base, name: "", label: (base.label || base.name) + " (copy)" };
      openEdit(cloned, true);
    }

    function handleUpdate(updater) {
      setEditing(prev => {
        if (!prev) return prev;
        return { ...prev, data: updater(prev.data) };
      });
      setDirty(true);
    }

    async function handleSave(themeData) {
      if (!themeData.name) { showToast("Slug (ID) is required", "error"); return; }
      if (!themeData.label) { showToast("Display name is required", "error"); return; }
      setSaving(true);
      const isNew = editing && editing.isNew;
      const method = isNew ? "POST" : "PUT";
      const url = isNew
        ? "/api/plugins/hermes-theme-editor/themes"
        : `/api/plugins/hermes-theme-editor/themes/${encodeURIComponent(themeData.name)}`;
      try {
        await fetchJSON(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(themeData),
        });
        showToast("✓ Theme saved");
        setDirty(false);
        // If the saved theme is currently active, apply CSS vars immediately
        // so changes are visible without a page reload.
        if (themeData.name === activeTheme) {
          applyThemeToDom(themeData);
        }
        await load();
        if (isNew) {
          setEditing(prev => prev ? { ...prev, isNew: false } : prev);
        }
      } catch (e) {
        showToast("Failed to save: " + e.message, "error");
      } finally {
        setSaving(false);
      }
    }

    async function handleActivate(themeData) {
      const name = themeData.name;
      try {
        await fetchJSON("/api/dashboard/theme", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        setActive(name);
        applyThemeToDom(themeData);
        showToast("✓ Theme activated");
      } catch (e) {
        showToast("Failed to activate: " + e.message, "error");
      }
    }

    async function handleDelete(name) {
      if (!window.confirm(`Delete theme "${name}"?`)) return;
      try {
        await fetchJSON(`/api/plugins/hermes-theme-editor/themes/${encodeURIComponent(name)}`, { method: "DELETE" });
        showToast("Theme deleted");
        setEditing(null);
        await load();
      } catch (e) {
        showToast("Failed to delete: " + e.message, "error");
      }
    }

    async function handleHideTab() {
      if (!window.confirm("Hide the Theme Editor tab from the sidebar?\n\nThe page will reload. You can re-enable it from the Plugins menu.")) return;
      setHiding(true);
      try {
        await fetchJSON("/api/dashboard/plugins/hermes-theme-editor/visibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hidden: true }),
        });
        window.location.reload();
      } catch (e) {
        showToast("Could not hide tab: " + e.message, "error");
        setHiding(false);
      }
    }

    const userThemeNames = useMemo(() => new Set(userThemes.map(u => u.name)), [userThemes]);
    const builtins = useMemo(() => allThemes.filter(t => BUILTIN_NAMES.has(t.name)), [allThemes]);

    if (loading) {
      return h("div", { className: "flex items-center justify-center h-64 text-muted-foreground" }, "Loading themes…");
    }

    return h("div", {
      style: {
        display: "flex",
        position: "absolute", inset: 0,  // fill the Hermes tab pane exactly
        overflow: "hidden",
      },
    },

      // Toast
      toast && h("div", {
        style: {
          position: "fixed", top: "1rem", right: "1rem", zIndex: 9999,
          padding: "0.5rem 1rem", borderRadius: "0.5rem", fontSize: "13px",
          background: toast.type === "error" ? "var(--color-error, #ef4444)" : "var(--color-primary, #6366f1)",
          color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }
      }, toast.msg),

      // ── Left: theme list ──────────────────────────────────────────────────
      h("div", {
        style: {
          width: "220px", minWidth: "220px",
          borderRight: "1px solid var(--color-border)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }
      },
        h("div", {
          style: {
            padding: "12px 10px 8px",
            borderBottom: "1px solid var(--color-border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }
        },
          h("span", { style: { fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)" } }, "My themes"),
          h("button", {
            onClick: () => openEdit(emptyTheme(), true),
            title: "New theme",
            style: { fontSize: "18px", lineHeight: 1, cursor: "pointer", color: "var(--color-primary)", background: "none", border: "none" },
          }, "+"),
        ),

        h("div", { style: { overflowY: "auto", flex: 1, display: "flex", flexDirection: "column" } },
          // User themes
          userThemes.length === 0 && h("p", {
            style: { fontSize: "11px", color: "var(--color-text-muted)", padding: "12px 12px", lineHeight: 1.5 }
          }, "No custom themes yet.\nClick + to create one."),

          userThemes.map(t => {
            const isEditing = editing && editing.data.name === t.name;
            const isAct = t.name === activeTheme;
            return h("button", {
              key: t.name,
              onClick: () => openEdit(t),
              style: {
                width: "100%", textAlign: "left", padding: "8px 12px",
                borderBottom: "1px solid var(--color-border)",
                background: isEditing ? "var(--color-primary, #6366f1)22" : "none",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                border: "none", borderBottom: "1px solid var(--color-border)",
              }
            },
              h("div", null,
                h("div", { style: { fontSize: "12px", fontWeight: 500 } }, t.label || t.name),
                h("div", { style: { fontSize: "10px", color: "var(--color-text-muted)", fontFamily: "monospace" } }, t.name),
              ),
              isAct && h("span", { style: { fontSize: "9px", padding: "1px 5px", borderRadius: "9999px", background: "var(--color-primary, #6366f1)", color: "#fff" } }, "active"),
            );
          }),

          // Built-in themes
          h("div", {
            style: { padding: "8px 10px 4px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)" }
          }, "Built-in (clone to edit)"),

          builtins.map(t =>
            h("div", {
              key: t.name,
              style: {
                padding: "7px 12px", borderBottom: "1px solid var(--color-border)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }
            },
              h("div", null,
                h("div", { style: { fontSize: "12px" } }, t.label || t.name),
                t.name === activeTheme && h("span", { style: { fontSize: "9px", padding: "1px 5px", borderRadius: "9999px", background: "var(--color-primary, #6366f1)", color: "#fff", marginLeft: "4px" } }, "active"),
              ),
              h("button", {
                onClick: () => openClone(t),
                style: { fontSize: "10px", padding: "2px 8px", borderRadius: "4px", cursor: "pointer", border: "1px solid var(--color-border)", background: "none", color: "var(--color-text-muted)" },
              }, "Clone"),
            )
          ),

          // Spacer to push Hide button to bottom
          h("div", { style: { flex: 1 } }),

          // Hide from sidebar — calls API + reloads so it takes effect immediately
          h("div", {
            style: {
              padding: "8px 10px",
              borderTop: "1px solid var(--color-border)",
              flexShrink: 0,
            }
          },
            h("button", {
              onClick: handleHideTab,
              disabled: hiding,
              title: "Remove this tab from the sidebar. Use the Plugins menu to restore it.",
              style: {
                width: "100%", padding: "5px 0", borderRadius: "5px",
                background: "transparent",
                border: "1px solid var(--color-border, rgba(255,255,255,0.1))",
                color: "var(--color-text-muted, #6b7280)",
                fontSize: "11px", cursor: hiding ? "not-allowed" : "pointer",
                opacity: hiding ? 0.5 : 1,
              },
            }, hiding ? "Hiding…" : "⊘ Hide from sidebar"),
          ),
        ),
      ),

      // ── Middle: editor ────────────────────────────────────────────────────
      h("div", {
        style: {
          flex: 1, display: "flex", flexDirection: "column",
          overflow: "hidden", minWidth: 0,
        }
      },
        !editing
          ? h("div", {
              style: {
                flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                color: "var(--color-text-muted)", gap: "12px", padding: "24px",
              }
            },
              h("div", { style: { fontSize: "40px" } }, "🎨"),
              h("p", { style: { fontSize: "14px", fontWeight: 500 } }, "Select a theme from the list to edit it"),
              h("p", { style: { fontSize: "12px", textAlign: "center", maxWidth: "300px" } },
                "User themes (like your Claude theme) are fully editable. Built-in themes can only be cloned."
              ),
              h("button", {
                onClick: () => openEdit(emptyTheme(), true),
                style: {
                  marginTop: "8px", padding: "8px 20px", borderRadius: "8px",
                  background: "var(--color-primary, #6366f1)", color: "#fff",
                  border: "none", fontSize: "13px", cursor: "pointer",
                }
              }, "+ Create new theme"),
            )
          : h("div", { style: { flex: 1, overflowY: "auto", padding: "12px 16px" } },
              h("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" } },
                h("span", { style: { fontSize: "15px", fontWeight: 600 } },
                  editing.isNew ? "New theme" : ("Editing: " + (editing.data.label || editing.data.name))
                ),
                BUILTIN_NAMES.has(editing.data.name) && !editing.isNew && h("span", { style: { fontSize: "10px", color: "var(--color-text-muted)", padding: "2px 6px", borderRadius: "4px", border: "1px solid var(--color-border)" } }, "Read-only — clone to edit"),
              ),
              h(ThemeForm, {
                theme: editing.data,
                isNew: editing.isNew,
                onUpdate: handleUpdate,
              }),
            ),
      ),

      // ── Right: live preview + action buttons ─────────────────────────────
      editing && h("div", {
        style: {
          width: "280px", minWidth: "280px",
          borderLeft: "1px solid var(--color-border)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }
      },
        // Header
        h("div", {
          style: {
            padding: "10px 12px 8px",
            borderBottom: "1px solid var(--color-border)",
            fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
            color: "var(--color-text-muted)", flexShrink: 0,
          }
        }, "Live Preview"),

        // Preview panel — flex:1 but shrinks for buttons below
        h("div", { style: { flex: 1, padding: "12px", overflow: "hidden", minHeight: 0 } },
          h(LivePreview, { theme: editing.data }),
        ),

        // ── Action buttons ───────────────────────────────────────────────
        h("div", {
          style: {
            padding: "10px 12px",
            borderTop: "1px solid var(--color-border)",
            display: "flex", flexDirection: "column", gap: "6px",
            flexShrink: 0,
          }
        },
          // Save (only for user / new themes)
          !BUILTIN_NAMES.has(editing.data.name) && h("button", {
            onClick: () => handleSave(editing.data),
            disabled: saving,
            style: {
              width: "100%", padding: "7px 0", borderRadius: "6px",
              background: saving ? "var(--color-muted, #334155)" : "var(--color-primary, #6366f1)",
              color: "#fff", border: "none", fontSize: "13px", fontWeight: 500,
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
            },
          }, saving ? "Saving…" : "💾 Save theme"),

          // Activate / Active indicator
          editing.data.name !== activeTheme
            ? h("button", {
                onClick: () => handleActivate(editing.data),
                style: {
                  width: "100%", padding: "6px 0", borderRadius: "6px",
                  background: "transparent",
                  border: "1px solid var(--color-border, rgba(255,255,255,0.12))",
                  color: "var(--color-foreground, inherit)", fontSize: "12px",
                  cursor: "pointer",
                },
              }, "✓ Activate")
            : h("div", {
                style: {
                  textAlign: "center", fontSize: "11px", padding: "6px",
                  color: "var(--color-primary, #6366f1)", fontWeight: 600,
                  border: "1px solid var(--color-primary, #6366f1)",
                  borderRadius: "6px", opacity: 0.85,
                }
              }, "✓ Active theme"),

          // Delete + Close row
          h("div", { style: { display: "flex", gap: "6px" } },
            !BUILTIN_NAMES.has(editing.data.name) && !editing.isNew && h("button", {
              onClick: () => handleDelete(editing.data.name),
              style: {
                flex: 1, padding: "5px 0", borderRadius: "6px",
                background: "transparent",
                border: "1px solid var(--color-destructive, #ef4444)",
                color: "var(--color-destructive, #ef4444)",
                fontSize: "12px", cursor: "pointer",
              },
            }, "🗑 Delete"),
            h("button", {
              onClick: () => { setEditing(null); setDirty(false); },
              style: {
                flex: 1, padding: "5px 0", borderRadius: "6px",
                background: "transparent",
                border: "1px solid var(--color-border, rgba(255,255,255,0.12))",
                color: "var(--color-foreground, inherit)",
                fontSize: "12px", cursor: "pointer",
              },
            }, "✕ Close"),
          ),

          // Dirty indicator
          isDirty && h("div", {
            style: {
              fontSize: "10px", textAlign: "center",
              color: "var(--color-warning, #f59e0b)", padding: "2px",
            }
          }, "● Unsaved changes"),
        ),
      ),
    );
  }

  // ── Register ──────────────────────────────────────────────────────────────
  if (window.__HERMES_PLUGINS__) {
    window.__HERMES_PLUGINS__.register("hermes-theme-editor", ThemeEditorPage);
  } else {
    console.error("[hermes-theme-editor] __HERMES_PLUGINS__ not found");
  }

})();
