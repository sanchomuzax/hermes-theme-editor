/**
 * Hermes Theme Editor — Dashboard Plugin v0.1.0
 *
 * Provides a visual editor for Hermes Agent dashboard themes stored in
 * ~/.hermes/dashboard-themes/*.yaml.
 *
 * Uses the Hermes Plugin SDK globals — no build step required:
 *   window.__HERMES_PLUGIN_SDK__  — React, hooks, components, fetchJSON, useI18n
 *   window.__HERMES_PLUGINS__     — register()
 *
 * API endpoints used:
 *   GET  /api/dashboard/themes               — list all themes + active
 *   PUT  /api/dashboard/theme                — set active theme { name }
 *   GET  /api/plugins/hermes-theme-editor/themes        — list user themes (full YAML)
 *   POST /api/plugins/hermes-theme-editor/themes        — create user theme
 *   PUT  /api/plugins/hermes-theme-editor/themes/:name  — update user theme
 *   DELETE /api/plugins/hermes-theme-editor/themes/:name — delete user theme
 */
(function () {
  "use strict";

  const SDK = window.__HERMES_PLUGIN_SDK__;
  if (!SDK) {
    console.error("[hermes-theme-editor] Plugin SDK not available");
    return;
  }

  const { React, hooks, fetchJSON, useI18n } = SDK;
  const { useState, useEffect, useCallback, useRef } = hooks;
  const { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Label } = SDK.components;
  const { cn } = SDK.utils;

  const h = React.createElement;

  // ── i18n ────────────────────────────────────────────────────────────────

  const TRANSLATIONS = {
    en: {
      title: "Theme Editor",
      builtIn: "Built-in themes",
      userThemes: "My themes",
      noUserThemes: "No custom themes yet.",
      createFirst: "Create your first theme",
      newTheme: "New theme",
      editTheme: "Edit theme",
      cloneTheme: "Clone",
      deleteTheme: "Delete",
      activateTheme: "Activate",
      active: "Active",
      save: "Save",
      saving: "Saving…",
      cancel: "Cancel",
      confirmDelete: "Delete this theme?",
      yes: "Yes, delete",
      no: "Cancel",
      name: "Slug (ID)",
      label: "Display name",
      description: "Description",
      palette: "Palette",
      background: "Background",
      midground: "Midground",
      foreground: "Foreground",
      warmGlow: "Warm glow color",
      noiseOpacity: "Noise opacity",
      typography: "Typography",
      fontSans: "Sans-serif stack",
      fontMono: "Monospace stack",
      fontDisplay: "Display / heading font",
      fontUrl: "Font stylesheet URL",
      fontUrlHint: "Google Fonts, Bunny Fonts, or self-hosted HTTPS URL",
      baseSize: "Base font size (px)",
      lineHeight: "Line height",
      letterSpacing: "Letter spacing",
      layout: "Layout",
      borderRadius: "Border radius",
      density: "Density",
      compact: "Compact",
      comfortable: "Comfortable",
      spacious: "Spacious",
      layoutVariant: "Layout variant",
      standard: "Standard",
      cockpit: "Cockpit (sidebar rail)",
      tiled: "Tiled (full width)",
      colorOverrides: "Color overrides",
      customCSS: "Custom CSS",
      customCSSHint: "Raw CSS injected on theme apply. Scoped automatically.",
      assets: "Assets",
      bgAsset: "Background asset (URL or gradient)",
      preview: "Preview",
      slugRequired: "Slug is required (lowercase, hyphens only)",
      labelRequired: "Display name is required",
      savedOk: "Theme saved",
      deletedOk: "Theme deleted",
      activatedOk: "Theme activated",
      errorSaving: "Failed to save theme",
      errorDeleting: "Failed to delete theme",
      errorActivating: "Failed to activate theme",
      popularFonts: "Popular open-source fonts",
      customUrl: "Custom URL…",
      fontPicker: "Choose font",
      namePlaceholder: "e.g. my-dark-theme",
      labelPlaceholder: "e.g. My Dark Theme",
      descPlaceholder: "Short description for the theme picker",
      previewText: "The quick brown fox jumps over the lazy dog.",
      previewHeading: "Dashboard Preview",
      hex: "Hex",
      alpha: "Alpha",
    },
    hu: {
      title: "Téma szerkesztő",
      builtIn: "Beépített témák",
      userThemes: "Saját témák",
      noUserThemes: "Még nincs egyéni téma.",
      createFirst: "Hozd létre az első témát",
      newTheme: "Új téma",
      editTheme: "Téma szerkesztése",
      cloneTheme: "Klónozás",
      deleteTheme: "Törlés",
      activateTheme: "Aktiválás",
      active: "Aktív",
      save: "Mentés",
      saving: "Mentés…",
      cancel: "Mégse",
      confirmDelete: "Törli ezt a témát?",
      yes: "Igen, törlés",
      no: "Mégse",
      name: "Azonosító (slug)",
      label: "Megjelenő név",
      description: "Leírás",
      palette: "Paletta",
      background: "Háttér",
      midground: "Középső réteg",
      foreground: "Előtér",
      warmGlow: "Meleg fény szín",
      noiseOpacity: "Zaj átlátszóság",
      typography: "Tipográfia",
      fontSans: "Sans-serif betűkészlet",
      fontMono: "Monospace betűkészlet",
      fontDisplay: "Display / fejléc betűkészlet",
      fontUrl: "Betűkészlet URL",
      fontUrlHint: "Google Fonts, Bunny Fonts vagy saját HTTPS URL",
      baseSize: "Alap betűméret (px)",
      lineHeight: "Sormagasság",
      letterSpacing: "Betűköz",
      layout: "Elrendezés",
      borderRadius: "Lekerekítés",
      density: "Sűrűség",
      compact: "Tömör",
      comfortable: "Kényelmes",
      spacious: "Tágas",
      layoutVariant: "Elrendezés variáns",
      standard: "Normál",
      cockpit: "Cockpit (oldalsáv)",
      tiled: "Csempézett (teljes szélesség)",
      colorOverrides: "Szín felülírások",
      customCSS: "Egyéni CSS",
      customCSSHint: "Nyers CSS amely témaváltáskor kerül befecskendezésre.",
      assets: "Erőforrások",
      bgAsset: "Háttér (URL vagy gradiens)",
      preview: "Előnézet",
      slugRequired: "Az azonosító kötelező (kisbetűk és kötőjelek)",
      labelRequired: "A megjelenő név kötelező",
      savedOk: "Téma mentve",
      deletedOk: "Téma törölve",
      activatedOk: "Téma aktiválva",
      errorSaving: "Mentés sikertelen",
      errorDeleting: "Törlés sikertelen",
      errorActivating: "Aktiválás sikertelen",
      popularFonts: "Népszerű nyílt betűkészletek",
      customUrl: "Egyéni URL…",
      fontPicker: "Betűkészlet választás",
      namePlaceholder: "pl. sajat-sotet-tema",
      labelPlaceholder: "pl. Saját Sötét Téma",
      descPlaceholder: "Rövid leírás a témaválasztóhoz",
      previewText: "Árvíztűrő tükörfúrógép.",
      previewHeading: "Dashboard előnézet",
      hex: "Hex",
      alpha: "Alfa",
    },
    zh: {
      title: "主题编辑器",
      builtIn: "内置主题",
      userThemes: "我的主题",
      noUserThemes: "暂无自定义主题。",
      createFirst: "创建第一个主题",
      newTheme: "新建主题",
      editTheme: "编辑主题",
      cloneTheme: "克隆",
      deleteTheme: "删除",
      activateTheme: "启用",
      active: "当前",
      save: "保存",
      saving: "保存中…",
      cancel: "取消",
      confirmDelete: "确认删除此主题？",
      yes: "确认删除",
      no: "取消",
      name: "标识符 (slug)",
      label: "显示名称",
      description: "描述",
      palette: "调色板",
      background: "背景色",
      midground: "中间色",
      foreground: "前景色",
      warmGlow: "暖光颜色",
      noiseOpacity: "噪点不透明度",
      typography: "字体排版",
      fontSans: "无衬线字体栈",
      fontMono: "等宽字体栈",
      fontDisplay: "展示字体",
      fontUrl: "字体样式表 URL",
      fontUrlHint: "Google Fonts、Bunny Fonts 或自托管 HTTPS URL",
      baseSize: "基础字号 (px)",
      lineHeight: "行高",
      letterSpacing: "字间距",
      layout: "布局",
      borderRadius: "圆角",
      density: "密度",
      compact: "紧凑",
      comfortable: "舒适",
      spacious: "宽松",
      layoutVariant: "布局变体",
      standard: "标准",
      cockpit: "驾驶舱（侧边栏）",
      tiled: "平铺（全宽）",
      colorOverrides: "颜色覆盖",
      customCSS: "自定义 CSS",
      customCSSHint: "主题应用时注入的原始 CSS。",
      assets: "资源",
      bgAsset: "背景资源（URL 或渐变）",
      preview: "预览",
      slugRequired: "标识符必填（小写字母和连字符）",
      labelRequired: "显示名称必填",
      savedOk: "主题已保存",
      deletedOk: "主题已删除",
      activatedOk: "主题已启用",
      errorSaving: "保存失败",
      errorDeleting: "删除失败",
      errorActivating: "启用失败",
      popularFonts: "常用开源字体",
      customUrl: "自定义 URL…",
      fontPicker: "选择字体",
      namePlaceholder: "例如 my-dark-theme",
      labelPlaceholder: "例如 我的深色主题",
      descPlaceholder: "主题选择器中显示的简短描述",
      previewText: "敏捷的棕色狐狸跳过了懒狗。",
      previewHeading: "仪表板预览",
      hex: "十六进制",
      alpha: "透明度",
    },
  };

  function usePluginI18n() {
    let locale = "en";
    try {
      const i18n = useI18n();
      locale = i18n.locale || "en";
    } catch (_) {}
    const t = TRANSLATIONS[locale] || TRANSLATIONS.en;
    return t;
  }

  // ── Popular open-source fonts ────────────────────────────────────────────

  const POPULAR_FONTS = [
    { name: "Inter",         url: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",         stack: '"Inter", system-ui, sans-serif' },
    { name: "Roboto",        url: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap",            stack: '"Roboto", system-ui, sans-serif' },
    { name: "Lato",          url: "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap",                  stack: '"Lato", system-ui, sans-serif' },
    { name: "Poppins",       url: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap",       stack: '"Poppins", system-ui, sans-serif' },
    { name: "Open Sans",     url: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap",         stack: '"Open Sans", system-ui, sans-serif' },
    { name: "Nunito",        url: "https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700&display=swap",            stack: '"Nunito", system-ui, sans-serif' },
    { name: "Montserrat",    url: "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;700&display=swap",        stack: '"Montserrat", system-ui, sans-serif' },
    { name: "Raleway",       url: "https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;700&display=swap",           stack: '"Raleway", system-ui, sans-serif' },
    { name: "DM Sans",       url: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&display=swap",           stack: '"DM Sans", system-ui, sans-serif' },
    { name: "Manrope",       url: "https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;700&display=swap",           stack: '"Manrope", system-ui, sans-serif' },
    { name: "Work Sans",     url: "https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;700&display=swap",         stack: '"Work Sans", system-ui, sans-serif' },
    { name: "Ubuntu",        url: "https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap",            stack: '"Ubuntu", system-ui, sans-serif' },
    { name: "Quicksand",     url: "https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;700&display=swap",         stack: '"Quicksand", system-ui, sans-serif' },
    { name: "Source Sans 3", url: "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600;700&display=swap",     stack: '"Source Sans 3", system-ui, sans-serif' },
    { name: "Playfair Display", url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;700&display=swap",   stack: '"Playfair Display", Georgia, serif' },
    { name: "Merriweather",  url: "https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap",          stack: '"Merriweather", Georgia, serif' },
    { name: "JetBrains Mono",url: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap",        stack: '"JetBrains Mono", ui-monospace, monospace' },
    { name: "Fira Code",     url: "https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;700&display=swap",         stack: '"Fira Code", ui-monospace, monospace' },
    { name: "IBM Plex Mono", url: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;700&display=swap",     stack: '"IBM Plex Mono", ui-monospace, monospace' },
    { name: "IBM Plex Sans", url: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;700&display=swap",     stack: '"IBM Plex Sans", system-ui, sans-serif' },
  ];

  // ── Default new theme template ───────────────────────────────────────────

  function defaultThemeData() {
    return {
      name: "",
      label: "",
      description: "",
      palette: {
        background: "#041c1c",
        midground: "#ffe6cb",
        foreground: { hex: "#ffffff", alpha: 0 },
        warmGlow: "rgba(255, 189, 56, 0.35)",
        noiseOpacity: 1,
      },
      typography: {
        fontSans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        fontMono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
        fontDisplay: "",
        fontUrl: "",
        baseSize: "15",
        lineHeight: "1.55",
        letterSpacing: "0",
      },
      layout: {
        radius: "0.5rem",
        density: "comfortable",
      },
      layoutVariant: "standard",
      colorOverrides: {},
      assets: { bg: "" },
      customCSS: "",
    };
  }

  // ── Utility helpers ──────────────────────────────────────────────────────

  function slugify(str) {
    return str
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);
  }

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ── Sub-components ───────────────────────────────────────────────────────

  function HexAlphaInput({ label: lbl, value, onChange }) {
    const isObj = value && typeof value === "object";
    const hex = isObj ? (value.hex || "#000000") : (value || "#000000");
    const alpha = isObj ? (value.alpha !== undefined ? value.alpha : 1) : 1;
    const showAlpha = isObj;

    function onHexChange(e) {
      if (showAlpha) {
        onChange({ hex: e.target.value, alpha });
      } else {
        onChange(e.target.value);
      }
    }
    function onAlphaChange(e) {
      const a = parseFloat(e.target.value);
      onChange({ hex, alpha: isNaN(a) ? 0 : Math.max(0, Math.min(1, a)) });
    }

    return h("div", { className: "flex flex-col gap-1" },
      h("label", { className: "text-xs text-muted-foreground" }, lbl),
      h("div", { className: "flex items-center gap-2" },
        h("input", {
          type: "color",
          value: hex.length === 7 ? hex : "#000000",
          onChange: onHexChange,
          className: "w-9 h-9 rounded border border-border cursor-pointer bg-transparent p-0.5",
        }),
        h(Input, {
          value: hex,
          onChange: onHexChange,
          className: "flex-1 font-mono text-xs h-9",
          placeholder: "#000000",
          maxLength: 9,
        }),
        showAlpha && h("div", { className: "flex items-center gap-1" },
          h("span", { className: "text-xs text-muted-foreground whitespace-nowrap" }, "α"),
          h(Input, {
            type: "number",
            value: alpha,
            onChange: onAlphaChange,
            min: 0,
            max: 1,
            step: 0.05,
            className: "w-20 text-xs h-9",
          })
        )
      )
    );
  }

  function SliderInput({ label: lbl, value, onChange, min, max, step, unit }) {
    const numVal = parseFloat(value) || 0;
    return h("div", { className: "flex flex-col gap-1" },
      h("div", { className: "flex justify-between" },
        h("label", { className: "text-xs text-muted-foreground" }, lbl),
        h("span", { className: "text-xs font-mono" }, value + (unit || ""))
      ),
      h("input", {
        type: "range",
        min, max, step,
        value: numVal,
        onChange: e => onChange(e.target.value),
        className: "w-full accent-primary h-1.5 rounded",
      })
    );
  }

  function FontSelector({ label: lbl, value, onChange, onUrlChange, urlValue, t }) {
    const [open, setOpen] = useState(false);
    const [customMode, setCustomMode] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
      function onDown(e) {
        if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      }
      document.addEventListener("mousedown", onDown);
      return () => document.removeEventListener("mousedown", onDown);
    }, []);

    function selectFont(font) {
      onChange(font.stack);
      if (onUrlChange) onUrlChange(font.url);
      setOpen(false);
    }

    return h("div", { className: "flex flex-col gap-1", ref },
      h("label", { className: "text-xs text-muted-foreground" }, lbl),
      h("div", { className: "flex gap-2" },
        h("div", { className: "relative flex-1" },
          h(Input, {
            value: value || "",
            onChange: e => onChange(e.target.value),
            className: "text-xs h-9 pr-20",
            placeholder: 'system-ui, sans-serif',
          }),
          h("button", {
            type: "button",
            onClick: () => setOpen(o => !o),
            className: "absolute right-1 top-1 text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground h-7",
          }, t.fontPicker + " ▾"),
          open && h("div", {
            className: "absolute z-50 top-10 left-0 w-80 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-xl",
          },
            h("div", { className: "p-2 text-xs font-semibold text-muted-foreground border-b border-border" }, t.popularFonts),
            POPULAR_FONTS.map(font =>
              h("button", {
                key: font.name,
                type: "button",
                onClick: () => selectFont(font),
                className: "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                style: { fontFamily: font.stack },
              }, font.name)
            )
          )
        )
      ),
      onUrlChange && h("div", { className: "flex flex-col gap-1 mt-1" },
        h("label", { className: "text-xs text-muted-foreground" }, t.fontUrl),
        h(Input, {
          value: urlValue || "",
          onChange: e => onUrlChange(e.target.value),
          className: "text-xs h-9",
          placeholder: "https://fonts.googleapis.com/css2?family=Inter…",
        }),
        h("p", { className: "text-xs text-muted-foreground" }, t.fontUrlHint)
      )
    );
  }

  function ColorOverrideRow({ tokenKey, value, onChange }) {
    return h("div", { className: "flex items-center gap-2" },
      h("span", { className: "text-xs font-mono w-40 shrink-0 text-muted-foreground" }, tokenKey),
      h("input", {
        type: "color",
        value: (value || "#000000").slice(0, 7),
        onChange: e => onChange(e.target.value),
        className: "w-8 h-8 rounded border border-border cursor-pointer bg-transparent p-0.5",
      }),
      h(Input, {
        value: value || "",
        onChange: e => onChange(e.target.value),
        className: "flex-1 font-mono text-xs h-8",
        placeholder: "#rrggbb or rgba(…)",
      })
    );
  }

  // ── Preview panel ────────────────────────────────────────────────────────

  function PreviewPanel({ theme, t }) {
    const bgColor = typeof theme.palette.background === "string"
      ? theme.palette.background
      : (theme.palette.background && theme.palette.background.hex) || "#041c1c";
    const fgColor = theme.colorOverrides && theme.colorOverrides.primary
      ? theme.colorOverrides.primary
      : "#6366f1";
    const textColor = theme.colorOverrides && theme.colorOverrides.muted
      ? theme.colorOverrides.muted
      : "#e2e8f0";
    const fontFamily = theme.typography.fontSans || "system-ui, sans-serif";
    const fontSize = (theme.typography.baseSize || "15") + "px";
    const lineHeight = theme.typography.lineHeight || "1.55";
    const radius = theme.layout.radius || "0.5rem";

    return h("div", {
      style: {
        background: bgColor,
        fontFamily,
        fontSize,
        lineHeight,
        borderRadius: radius,
        padding: "1.25rem",
        color: textColor,
        border: "1px solid rgba(255,255,255,0.08)",
        minHeight: "180px",
      }
    },
      h("h3", { style: { color: fgColor, fontWeight: 600, marginBottom: "0.5rem", fontSize: "1.05em" } },
        t.previewHeading
      ),
      h("p", { style: { marginBottom: "0.75rem", opacity: 0.8, fontSize: "0.9em" } }, t.previewText),
      h("div", { style: { display: "flex", gap: "0.5rem" } },
        h("button", {
          style: {
            background: fgColor,
            color: bgColor,
            border: "none",
            padding: "0.35rem 0.85rem",
            borderRadius: radius,
            fontSize: "0.85em",
            cursor: "pointer",
            fontFamily,
          }
        }, t.activateTheme),
        h("button", {
          style: {
            background: "transparent",
            color: textColor,
            border: "1px solid rgba(255,255,255,0.15)",
            padding: "0.35rem 0.85rem",
            borderRadius: radius,
            fontSize: "0.85em",
            cursor: "pointer",
            fontFamily,
          }
        }, t.cancel)
      )
    );
  }

  // ── Theme editor form ────────────────────────────────────────────────────

  const COLOR_OVERRIDE_KEYS = [
    "primary", "primaryForeground",
    "secondary", "secondaryForeground",
    "accent", "accentForeground",
    "muted", "mutedForeground",
    "card", "cardForeground",
    "destructive", "destructiveForeground",
    "success", "warning",
    "border", "input", "ring",
  ];

  function ThemeEditorForm({ initial, onSave, onCancel, isNew, t }) {
    const [form, setForm] = useState(initial || defaultThemeData());
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (path, value) => {
      const parts = path.split(".");
      setForm(prev => {
        const next = { ...prev };
        let cur = next;
        for (let i = 0; i < parts.length - 1; i++) {
          cur[parts[i]] = { ...cur[parts[i]] };
          cur = cur[parts[i]];
        }
        cur[parts[parts.length - 1]] = value;
        return next;
      });
    };

    const setPalette = (k, v) => set("palette." + k, v);
    const setTypo = (k, v) => set("typography." + k, v);
    const setLayout = (k, v) => set("layout." + k, v);
    const setOverride = (k, v) => {
      setForm(prev => ({
        ...prev,
        colorOverrides: { ...prev.colorOverrides, [k]: v },
      }));
    };

    function validate() {
      const errs = {};
      if (!form.name || !form.name.trim()) errs.name = t.slugRequired;
      if (!form.label || !form.label.trim()) errs.label = t.labelRequired;
      setErrors(errs);
      return Object.keys(errs).length === 0;
    }

    async function handleSave() {
      if (!validate()) return;
      setSaving(true);
      try {
        await onSave(form);
      } finally {
        setSaving(false);
      }
    }

    const palette = form.palette || {};
    const typo = form.typography || {};
    const layout = form.layout || {};
    const overrides = form.colorOverrides || {};

    return h("div", { className: "flex flex-col gap-6 p-4 overflow-y-auto" },

      // Basic info
      h(Card, null,
        h(CardHeader, null, h(CardTitle, { className: "text-sm" }, t.label + " & " + t.name)),
        h(CardContent, { className: "flex flex-col gap-3" },
          h("div", { className: "flex flex-col gap-1" },
            h(Label, { className: "text-xs" }, t.name),
            h(Input, {
              value: form.name || "",
              onChange: e => {
                const v = isNew ? slugify(e.target.value) : e.target.value;
                set("name", v);
              },
              placeholder: t.namePlaceholder,
              disabled: !isNew,
              className: cn("font-mono text-xs", errors.name && "border-destructive"),
            }),
            errors.name && h("p", { className: "text-xs text-destructive" }, errors.name)
          ),
          h("div", { className: "flex flex-col gap-1" },
            h(Label, { className: "text-xs" }, t.label),
            h(Input, {
              value: form.label || "",
              onChange: e => {
                set("label", e.target.value);
                if (isNew && !form.name) set("name", slugify(e.target.value));
              },
              placeholder: t.labelPlaceholder,
              className: cn("text-xs", errors.label && "border-destructive"),
            }),
            errors.label && h("p", { className: "text-xs text-destructive" }, errors.label)
          ),
          h("div", { className: "flex flex-col gap-1" },
            h(Label, { className: "text-xs" }, t.description),
            h(Input, {
              value: form.description || "",
              onChange: e => set("description", e.target.value),
              placeholder: t.descPlaceholder,
              className: "text-xs",
            })
          )
        )
      ),

      // Palette
      h(Card, null,
        h(CardHeader, null, h(CardTitle, { className: "text-sm" }, t.palette)),
        h(CardContent, { className: "flex flex-col gap-3" },
          h(HexAlphaInput, { label: t.background, value: palette.background, onChange: v => setPalette("background", v) }),
          h(HexAlphaInput, { label: t.midground, value: palette.midground, onChange: v => setPalette("midground", v) }),
          h(HexAlphaInput, { label: t.foreground, value: palette.foreground, onChange: v => setPalette("foreground", v) }),
          h("div", { className: "flex flex-col gap-1" },
            h("label", { className: "text-xs text-muted-foreground" }, t.warmGlow),
            h(Input, {
              value: palette.warmGlow || "",
              onChange: e => setPalette("warmGlow", e.target.value),
              placeholder: "rgba(255, 189, 56, 0.35)",
              className: "text-xs font-mono h-9",
            })
          ),
          h(SliderInput, {
            label: t.noiseOpacity,
            value: String(palette.noiseOpacity !== undefined ? palette.noiseOpacity : 1),
            onChange: v => setPalette("noiseOpacity", parseFloat(v)),
            min: 0, max: 1.2, step: 0.05, unit: "",
          })
        )
      ),

      // Typography
      h(Card, null,
        h(CardHeader, null, h(CardTitle, { className: "text-sm" }, t.typography)),
        h(CardContent, { className: "flex flex-col gap-3" },
          h(FontSelector, {
            label: t.fontSans,
            value: typo.fontSans,
            onChange: v => setTypo("fontSans", v),
            onUrlChange: v => setTypo("fontUrl", v),
            urlValue: typo.fontUrl,
            t,
          }),
          h(FontSelector, {
            label: t.fontMono,
            value: typo.fontMono,
            onChange: v => setTypo("fontMono", v),
            t,
          }),
          h(FontSelector, {
            label: t.fontDisplay,
            value: typo.fontDisplay,
            onChange: v => setTypo("fontDisplay", v),
            t,
          }),
          h(SliderInput, {
            label: t.baseSize,
            value: String(parseFloat(typo.baseSize) || 15),
            onChange: v => setTypo("baseSize", v + "px"),
            min: 10, max: 24, step: 1, unit: "px",
          }),
          h(SliderInput, {
            label: t.lineHeight,
            value: String(parseFloat(typo.lineHeight) || 1.55),
            onChange: v => setTypo("lineHeight", v),
            min: 1.0, max: 2.2, step: 0.05, unit: "",
          }),
          h("div", { className: "flex flex-col gap-1" },
            h("label", { className: "text-xs text-muted-foreground" }, t.letterSpacing),
            h(Input, {
              value: typo.letterSpacing || "0",
              onChange: e => setTypo("letterSpacing", e.target.value),
              placeholder: "0  or  0.01em",
              className: "text-xs font-mono h-9",
            })
          )
        )
      ),

      // Layout
      h(Card, null,
        h(CardHeader, null, h(CardTitle, { className: "text-sm" }, t.layout)),
        h(CardContent, { className: "flex flex-col gap-3" },
          h("div", { className: "flex flex-col gap-1" },
            h("label", { className: "text-xs text-muted-foreground" }, t.borderRadius),
            h(Input, {
              value: layout.radius || "0.5rem",
              onChange: e => setLayout("radius", e.target.value),
              placeholder: "0.5rem",
              className: "text-xs font-mono h-9",
            })
          ),
          h("div", { className: "flex flex-col gap-1" },
            h("label", { className: "text-xs text-muted-foreground" }, t.density),
            h("select", {
              value: layout.density || "comfortable",
              onChange: e => setLayout("density", e.target.value),
              className: "text-xs h-9 rounded-md border border-input bg-background px-3",
            },
              h("option", { value: "compact" }, t.compact),
              h("option", { value: "comfortable" }, t.comfortable),
              h("option", { value: "spacious" }, t.spacious)
            )
          ),
          h("div", { className: "flex flex-col gap-1" },
            h("label", { className: "text-xs text-muted-foreground" }, t.layoutVariant),
            h("select", {
              value: form.layoutVariant || "standard",
              onChange: e => set("layoutVariant", e.target.value),
              className: "text-xs h-9 rounded-md border border-input bg-background px-3",
            },
              h("option", { value: "standard" }, t.standard),
              h("option", { value: "cockpit" }, t.cockpit),
              h("option", { value: "tiled" }, t.tiled)
            )
          )
        )
      ),

      // Color overrides
      h(Card, null,
        h(CardHeader, null, h(CardTitle, { className: "text-sm" }, t.colorOverrides)),
        h(CardContent, { className: "flex flex-col gap-2" },
          COLOR_OVERRIDE_KEYS.map(key =>
            h(ColorOverrideRow, {
              key,
              tokenKey: key,
              value: overrides[key] || "",
              onChange: v => setOverride(key, v),
            })
          )
        )
      ),

      // Assets
      h(Card, null,
        h(CardHeader, null, h(CardTitle, { className: "text-sm" }, t.assets)),
        h(CardContent, null,
          h("div", { className: "flex flex-col gap-1" },
            h("label", { className: "text-xs text-muted-foreground" }, t.bgAsset),
            h(Input, {
              value: (form.assets && form.assets.bg) || "",
              onChange: e => setForm(prev => ({ ...prev, assets: { ...prev.assets, bg: e.target.value } })),
              placeholder: "linear-gradient(165deg, #041c1c 0%, #0a2a2a 100%)",
              className: "text-xs font-mono h-9",
            })
          )
        )
      ),

      // Custom CSS
      h(Card, null,
        h(CardHeader, null, h(CardTitle, { className: "text-sm" }, t.customCSS)),
        h(CardContent, { className: "flex flex-col gap-2" },
          h("textarea", {
            value: form.customCSS || "",
            onChange: e => set("customCSS", e.target.value),
            rows: 8,
            placeholder: "/* CSS injected on theme apply */\n:root[data-theme=\"my-theme\"] { }",
            className: "w-full text-xs font-mono rounded-md border border-input bg-background px-3 py-2 resize-y min-h-[8rem]",
          }),
          h("p", { className: "text-xs text-muted-foreground" }, t.customCSSHint)
        )
      ),

      // Live preview
      h(Card, null,
        h(CardHeader, null, h(CardTitle, { className: "text-sm" }, t.preview)),
        h(CardContent, null,
          h(PreviewPanel, { theme: form, t })
        )
      ),

      // Action buttons
      h("div", { className: "flex items-center gap-3 pb-4" },
        h(Button, {
          onClick: handleSave,
          disabled: saving,
          className: "flex-1",
        }, saving ? t.saving : t.save),
        h(Button, {
          onClick: onCancel,
          variant: "outline",
        }, t.cancel)
      )
    );
  }

  // ── Theme list item ──────────────────────────────────────────────────────

  function ThemeListItem({ theme, isActive, isUser, onEdit, onClone, onDelete, onActivate, t }) {
    const [confirmDel, setConfirmDel] = useState(false);

    return h("div", {
      className: cn(
        "flex items-start justify-between gap-3 p-3 rounded-lg border transition-colors",
        isActive
          ? "border-primary/50 bg-primary/5"
          : "border-border hover:bg-muted/30",
      )
    },
      h("div", { className: "flex flex-col gap-0.5 flex-1 min-w-0" },
        h("div", { className: "flex items-center gap-2" },
          h("span", { className: "text-sm font-medium truncate" }, theme.label || theme.name),
          isActive && h(Badge, { variant: "default", className: "text-xs shrink-0" }, t.active)
        ),
        theme.description && h("p", { className: "text-xs text-muted-foreground truncate" }, theme.description),
        h("p", { className: "text-xs text-muted-foreground font-mono" }, theme.name)
      ),
      h("div", { className: "flex items-center gap-1 shrink-0" },
        !isActive && h(Button, {
          variant: "outline",
          onClick: () => onActivate(theme.name),
          className: "text-xs h-7 px-2",
        }, t.activateTheme),
        isUser && h(Button, {
          variant: "ghost",
          onClick: () => onEdit(theme),
          className: "text-xs h-7 px-2",
        }, "✏"),
        h(Button, {
          variant: "ghost",
          onClick: () => onClone(theme),
          className: "text-xs h-7 px-2",
        }, t.cloneTheme),
        isUser && !confirmDel && h(Button, {
          variant: "ghost",
          onClick: () => setConfirmDel(true),
          className: "text-xs h-7 px-2 text-destructive hover:text-destructive",
        }, "✕"),
        confirmDel && h("div", { className: "flex items-center gap-1" },
          h("span", { className: "text-xs text-destructive" }, t.confirmDelete),
          h(Button, {
            variant: "destructive",
            onClick: () => { setConfirmDel(false); onDelete(theme.name); },
            className: "text-xs h-7 px-2",
          }, t.yes),
          h(Button, {
            variant: "ghost",
            onClick: () => setConfirmDel(false),
            className: "text-xs h-7 px-2",
          }, t.no)
        )
      )
    );
  }

  // ── Main page component ──────────────────────────────────────────────────

  function ThemeEditorPage() {
    const t = usePluginI18n();

    const [allThemes, setAllThemes] = useState([]);
    const [activeTheme, setActiveTheme] = useState(null);
    const [userThemes, setUserThemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState("list"); // 'list' | 'editor'
    const [editTarget, setEditTarget] = useState(null); // full theme dict or null for new
    const [isNew, setIsNew] = useState(false);
    const [toast, setToast] = useState(null);

    function showToast(msg, type = "ok") {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3000);
    }

    async function loadThemes() {
      setLoading(true);
      try {
        const [allRes, userRes] = await Promise.all([
          fetchJSON("/api/dashboard/themes"),
          fetchJSON("/api/plugins/hermes-theme-editor/themes"),
        ]);
        setAllThemes(allRes.themes || []);
        setActiveTheme(allRes.active || null);
        setUserThemes(userRes.themes || []);
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        setLoading(false);
      }
    }

    useEffect(() => { loadThemes(); }, []);

    async function handleActivate(name) {
      try {
        await fetchJSON("/api/dashboard/theme", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        setActiveTheme(name);
        showToast(t.activatedOk);
      } catch {
        showToast(t.errorActivating, "error");
      }
    }

    async function handleDelete(name) {
      try {
        await fetchJSON(`/api/plugins/hermes-theme-editor/themes/${encodeURIComponent(name)}`, {
          method: "DELETE",
        });
        showToast(t.deletedOk);
        loadThemes();
      } catch {
        showToast(t.errorDeleting, "error");
      }
    }

    async function handleSave(formData) {
      const method = isNew ? "POST" : "PUT";
      const url = isNew
        ? "/api/plugins/hermes-theme-editor/themes"
        : `/api/plugins/hermes-theme-editor/themes/${encodeURIComponent(formData.name)}`;
      try {
        await fetchJSON(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        showToast(t.savedOk);
        setView("list");
        loadThemes();
      } catch (err) {
        showToast(t.errorSaving + ": " + err.message, "error");
        throw err;
      }
    }

    function handleEdit(theme) {
      const userTheme = userThemes.find(u => u.name === theme.name) || theme;
      const parsed = {
        ...defaultThemeData(),
        ...userTheme,
        palette: { ...defaultThemeData().palette, ...(userTheme.palette || {}) },
        typography: { ...defaultThemeData().typography, ...(userTheme.typography || {}) },
        layout: { ...defaultThemeData().layout, ...(userTheme.layout || {}) },
        colorOverrides: userTheme.colorOverrides || {},
        assets: userTheme.assets || {},
      };
      setEditTarget(parsed);
      setIsNew(false);
      setView("editor");
    }

    function handleClone(theme) {
      const source = userThemes.find(u => u.name === theme.name) || theme.definition || theme;
      const cloned = {
        ...defaultThemeData(),
        ...source,
        name: "",
        label: (source.label || source.name || "") + " (copy)",
        palette: { ...defaultThemeData().palette, ...(source.palette || {}) },
        typography: { ...defaultThemeData().typography, ...(source.typography || {}) },
        layout: { ...defaultThemeData().layout, ...(source.layout || {}) },
        colorOverrides: { ...(source.colorOverrides || {}) },
        assets: { ...(source.assets || {}) },
      };
      setEditTarget(cloned);
      setIsNew(true);
      setView("editor");
    }

    function handleNew() {
      setEditTarget(defaultThemeData());
      setIsNew(true);
      setView("editor");
    }

    const builtinNames = new Set(
      allThemes.filter(t => !t.definition).map(t => t.name)
    );

    // Render

    if (loading) {
      return h("div", { className: "flex items-center justify-center h-64 text-muted-foreground" }, "⏳ Loading…");
    }

    if (view === "editor") {
      return h("div", { className: "max-w-2xl mx-auto" },
        h("div", { className: "flex items-center gap-3 px-4 pt-4 pb-2" },
          h("button", {
            onClick: () => setView("list"),
            className: "text-muted-foreground hover:text-foreground text-sm",
          }, "← " + t.cancel),
          h("h2", { className: "text-base font-semibold" }, isNew ? t.newTheme : t.editTheme)
        ),
        h(ThemeEditorForm, {
          initial: editTarget,
          onSave: handleSave,
          onCancel: () => setView("list"),
          isNew,
          t,
        })
      );
    }

    const userThemeNames = new Set(userThemes.map(u => u.name));

    return h("div", { className: "flex flex-col gap-6 p-4 max-w-3xl mx-auto" },

      // Toast
      toast && h("div", {
        className: cn(
          "fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm shadow-lg",
          toast.type === "error" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
        )
      }, toast.msg),

      // Header
      h("div", { className: "flex items-center justify-between" },
        h("h1", { className: "text-xl font-bold" }, t.title),
        h(Button, { onClick: handleNew }, "+ " + t.newTheme)
      ),

      // Built-in themes
      h(Card, null,
        h(CardHeader, null, h(CardTitle, { className: "text-sm text-muted-foreground" }, t.builtIn)),
        h(CardContent, { className: "flex flex-col gap-2" },
          allThemes.filter(th => builtinNames.has(th.name)).map(theme =>
            h(ThemeListItem, {
              key: theme.name,
              theme,
              isActive: theme.name === activeTheme,
              isUser: false,
              onEdit: handleEdit,
              onClone: handleClone,
              onDelete: handleDelete,
              onActivate: handleActivate,
              t,
            })
          )
        )
      ),

      // User themes
      h(Card, null,
        h(CardHeader, null, h(CardTitle, { className: "text-sm text-muted-foreground" }, t.userThemes)),
        h(CardContent, { className: "flex flex-col gap-2" },
          userThemes.length === 0
            ? h("div", { className: "flex flex-col items-center gap-3 py-6 text-muted-foreground" },
                h("p", { className: "text-sm" }, t.noUserThemes),
                h(Button, { variant: "outline", onClick: handleNew }, t.createFirst)
              )
            : userThemes.map(theme =>
                h(ThemeListItem, {
                  key: theme.name,
                  theme,
                  isActive: theme.name === activeTheme,
                  isUser: true,
                  onEdit: handleEdit,
                  onClone: handleClone,
                  onDelete: handleDelete,
                  onActivate: handleActivate,
                  t,
                })
              )
        )
      )
    );
  }

  // ── Register the plugin ──────────────────────────────────────────────────

  if (window.__HERMES_PLUGINS__) {
    window.__HERMES_PLUGINS__.register("hermes-theme-editor", ThemeEditorPage);
  } else {
    console.error("[hermes-theme-editor] __HERMES_PLUGINS__ not available — plugin not registered");
  }

})();
