/**
 * Token derivation for dsh-futuristic-themes.
 *
 * A theme author supplies a compact palette of *roles* (background, surfaces,
 * borders, text grades, accents, states). This module expands those roles into
 * the full `--dsw-alias-*` / `--dsw-specific-*` token set that the DSH client
 * theme registry accepts, so every theme is complete by construction and the
 * three themes stay internally consistent.
 *
 * Per-token exact overrides are merged last, which is the escape hatch for a
 * palette that needs something the scale cannot express.
 */

/* ------------------------------------------------------------------ colour */

export function parseColor(value) {
  if (typeof value !== "string") throw new TypeError(`color must be a string, got ${typeof value}`);
  const raw = value.trim();
  let m = /^#([0-9a-f]{3})$/i.exec(raw);
  if (m) {
    const [r, g, b] = m[1].split("").map((c) => parseInt(c + c, 16));
    return [r, g, b];
  }
  m = /^#([0-9a-f]{6})$/i.exec(raw);
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  throw new TypeError(`unsupported colour "${value}": use #rgb or #rrggbb`);
}

const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
const toHex = ([r, g, b]) => "#" + [r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("");

/** Alpha-composite `fg` over `bg` at `alpha` (both opaque hex). */
export function over(fg, bg, alpha) {
  const [fr, fg_, fb] = parseColor(fg);
  const [br, bg_, bb] = parseColor(bg);
  return toHex([fr * alpha + br * (1 - alpha), fg_ * alpha + bg_ * (1 - alpha), fb * alpha + bb * (1 - alpha)]);
}

/** Linear sRGB interpolation; `t=0` returns `a`, `t=1` returns `b`. */
export function mix(a, b, t) {
  const [ar, ag, ab] = parseColor(a);
  const [br, bg, bb] = parseColor(b);
  return toHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

export const lighten = (color, t) => mix(color, "#ffffff", t);
export const darken = (color, t) => mix(color, "#000000", t);

/** `rgba()` string from a hex colour. */
export function alpha(color, value) {
  const [r, g, b] = parseColor(color);
  const a = Math.max(0, Math.min(1, value));
  return `rgba(${r}, ${g}, ${b}, ${+a.toFixed(3)})`;
}

/** WCAG relative luminance. */
export function luminance(color) {
  const channels = parseColor(color).map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG contrast ratio between two opaque colours. */
export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/* ------------------------------------------------------------ role schema */

/**
 * Roles are the whole input surface for a theme. Every one is an opaque hex
 * colour; `sidebarFill`, `menuFill` and `bgDeep` are the only optional extras.
 */
export const ROLE_DOCS = {
  bg: "Application base background (the conversation column).",
  bgDeep: "Deeper background behind the app (window chrome, gradient base). Defaults to bg.",
  surface1: "Raised surface: cards, terminal frame, code blocks.",
  surface2: "Second surface layer: inputs, bubbles, popovers, inline code.",
  surface3: "Third surface layer: menus, tooltips, tags, elevated rows.",
  overlay: "Overlay fill (menus/overlays layer token --dsw-alias-bg-overlay).",
  border: "Base border colour; tints derive from it.",
  dim: "Disabled / very quiet text and marks.",
  text: "Primary text.",
  secondary: "Secondary text (labels, metadata).",
  primary: "Brand / accent colour: selected states, primary buttons, focus ring.",
  bright: "Brighter accent for hover, focus and active states.",
  warning: "Warnings and errors.",
  ok: "Success and confirmations.",
  info: "Informational secondary signal (charts, connection status, secondary highlights).",
  sidebarFill: "Optional raw CSS background for the sidebar (may be a gradient). Defaults to bgDeep.",
  menuFill: "Optional raw rgba() fill for menus; defaults to a translucent surface3.",
};

export const REQUIRED_ROLES = [
  "bg",
  "surface1",
  "surface2",
  "surface3",
  "overlay",
  "border",
  "dim",
  "text",
  "secondary",
  "primary",
  "bright",
  "warning",
  "ok",
  "info",
];

/** Tokens the host documents as required for a complete override set. */
export const REQUIRED_TOKENS = [
  "--dsw-alias-bg-base",
  "--dsw-alias-bg-layer-1",
  "--dsw-alias-bg-layer-2",
  "--dsw-alias-bg-overlay",
  "--dsw-alias-border-l1",
  "--dsw-alias-border-l2",
  "--dsw-alias-brand-primary",
  "--dsw-alias-label-primary",
  "--dsw-alias-label-secondary",
  "--dsw-alias-state-error-primary",
  "--dsw-alias-state-idle-primary",
  "--dsw-alias-state-success-primary",
  "--dsw-alias-state-warn-primary",
];

/* ------------------------------------------------------------- derivation */

/** The host menu surface token is a documented `--dsw-*` value outside the alias/specific prefixes. */
export function isThemeTokenName(name) {
  return /^--dsw-(alias|specific)-/.test(name) || name === "--dsw-menu-surface-fill";
}

/**
 * Expand a theme's roles into the flat token map a theme registry definition
 * needs (`Record<--dsw-*, string>`, flattened — not the `{light,dark}` pair
 * shape used by override layers).
 *
 * @param {object} theme - a theme definition from `src/themes/*.json`.
 * @returns {Record<string, string>} complete token map.
 */
export function deriveTokens(theme) {
  const roles = theme.roles ?? {};
  for (const role of REQUIRED_ROLES) {
    if (typeof roles[role] !== "string") {
      throw new Error(`theme "${theme.id}": missing role "${role}" (${ROLE_DOCS[role]})`);
    }
  }
  const r = { ...roles };
  r.bgDeep = r.bgDeep ?? r.bg;
  const border = r.border;
  const text = r.text;
  const bg = r.bg;

  const borderTints = {
    l1: alpha(border, 0.45),
    l2: alpha(border, 0.7),
    l3: border,
    l4: mix(border, text, 0.2),
  };
  const tertiary = mix(r.secondary, r.dim, 0.5);
  const caption = mix(r.secondary, r.bg, 0.35);
  const dimmed = mix(r.dim, r.bg, 0.35);
  const surfaceMix = (t) => mix(r.surface2, r.bg, t);

  const tokens = {
    /* ---- backgrounds ---- */
    "--dsw-alias-bg-base": r.bg,
    "--dsw-alias-bg-l1": r.surface1,
    "--dsw-alias-bg-layer-1": r.surface1,
    "--dsw-alias-bg-layer-2": r.surface2,
    "--dsw-alias-bg-layer-3": r.surface3,
    "--dsw-alias-bg-layer-4": r.overlay,
    "--dsw-alias-bg-overlay": r.overlay,
    "--dsw-alias-bg-module-platform": r.surface2,
    "--dsw-alias-bg-multi-select": r.surface2,
    "--dsw-alias-bg-document-preview": r.bg,
    "--dsw-alias-bg-document-selection": alpha(r.primary, 0.28),
    "--dsw-alias-bg-skeleton": alpha(text, 0.06),
    "--dsw-alias-bg-mask-1": "rgba(0, 0, 0, 0.55)",
    "--dsw-alias-bg-mask-2": "rgba(0, 0, 0, 0.18)",
    "--dsw-alias-bg-mask-3": "rgba(0, 0, 0, 0.62)",
    "--dsw-alias-bg-mask-photo": "rgba(0, 0, 0, 0.88)",
    "--dsw-alias-bg-mask-drop": alpha(r.surface3, 0.72),

    /* ---- borders ---- */
    "--dsw-alias-border-inverted": alpha(text, 0.08),
    "--dsw-alias-border-inverted2": alpha(text, 0.14),
    "--dsw-alias-border-l1": borderTints.l1,
    "--dsw-alias-border-l2": borderTints.l2,
    "--dsw-alias-border-l2-darkmode-thin": borderTints.l1,
    "--dsw-alias-border-l3": borderTints.l3,
    "--dsw-alias-border-l4": borderTints.l4,
    "--dsw-alias-separator-primary": borderTints.l2,

    /* ---- text ---- */
    "--dsw-alias-label-primary": text,
    "--dsw-alias-label-secondary": r.secondary,
    "--dsw-alias-label-tertiary": tertiary,
    "--dsw-alias-label-caption": caption,
    "--dsw-alias-label-quaternary": mix(tertiary, r.bg, 0.3),
    "--dsw-alias-label-dimmed": dimmed,
    "--dsw-alias-label-primary-dimmed": text,
    "--dsw-alias-label-primary-bluish": text,
    "--dsw-alias-label-primary-foreground": r.bgDeep,
    "--dsw-alias-label-primary-inverted": mix(r.bg, r.surface3, 0.5),
    "--dsw-alias-label-document-preview": r.secondary,
    "--dsw-alias-label-shimmer": alpha(text, 0.4),
    "--dsw-alias-label-deep-diving": r.info,
    "--dsw-alias-label-deep-diving-shimmer": alpha(r.info, 0.55),
    "--dsw-alias-menu-icon": r.secondary,
    "--dsw-alias-link": r.primary,

    /* ---- brand ---- */
    "--dsw-alias-brand-primary": r.primary,
    "--dsw-alias-brand-primary-invert": text,
    "--dsw-alias-brand-primary-new-colorprimary-new-color": r.primary,
    "--dsw-alias-brand-text": text,

    /* ---- buttons ---- */
    "--dsw-alias-button-contrast-fill": text,
    "--dsw-alias-button-elevated-fill": r.surface3,
    "--dsw-alias-button-floating-fill": r.surface2,
    "--dsw-alias-button-floating-hover": r.surface3,
    "--dsw-alias-button-ghost-active-border": r.primary,
    "--dsw-alias-button-ghost-active-fill": alpha(r.primary, 0.16),
    "--dsw-alias-button-ghost-active-hover": alpha(r.primary, 0.26),
    "--dsw-alias-button-info-fill": r.primary,
    "--dsw-alias-button-info-hover": r.bright,
    "--dsw-alias-button-primary-dimmed": alpha(r.primary, 0.4),
    "--dsw-alias-button-primary-fill": r.primary,
    "--dsw-alias-button-primary-hover": r.bright,
    "--dsw-alias-button-tool-bar-fill-invisible": alpha(r.surface3, 0.55),
    "--dsw-alias-button-tool-bar-fill": alpha(r.surface3, 0.75),
    "--dsw-alias-button-tool-bar-hover": alpha(r.surface3, 0.9),

    /* ---- interaction fills ---- */
    "--dsw-alias-interactive-bg-hover": alpha(text, 0.07),
    "--dsw-alias-interactive-bg-hover-solid": r.surface3,
    "--dsw-alias-interactive-bg-active": alpha(text, 0.13),
    "--dsw-alias-interactive-bg-hover-accent": alpha(r.primary, 0.18),
    "--dsw-alias-interactive-bg-hover-danger": alpha(r.warning, 0.16),
    "--dsw-alias-fill-l1": alpha(text, 0.05),
    "--dsw-alias-fill-l2": alpha(text, 0.09),
    "--dsw-alias-fill-tertiary": alpha(text, 0.04),
    "--dsw-alias-fill-tsp-secondary": alpha(text, 0.12),

    /* ---- states ---- */
    "--dsw-alias-state-business-primary": r.primary,
    "--dsw-alias-state-business-tertiary": alpha(r.primary, 0.18),
    "--dsw-alias-state-error-primary": r.warning,
    "--dsw-alias-state-error-secondary": lighten(r.warning, 0.25),
    "--dsw-alias-state-idle-primary": r.border,
    "--dsw-alias-state-success-primary": r.ok,
    "--dsw-alias-state-success-secondary": lighten(r.ok, 0.22),
    "--dsw-alias-state-success-tertiary": alpha(r.ok, 0.16),
    "--dsw-alias-state-warn-label": r.warning,
    "--dsw-alias-state-warn-primary": r.warning,
    "--dsw-alias-state-warn-secondary": lighten(r.warning, 0.2),
    "--dsw-alias-state-warn-tertiary": alpha(r.warning, 0.16),

    /* ---- code / diff ---- */
    "--dsw-alias-code-diff-added": alpha(r.ok, 0.1),
    "--dsw-alias-code-diff-deleted": alpha(r.warning, 0.1),
    "--dsw-alias-file-diff-added-bg": mix(bg, r.ok, 0.14),
    "--dsw-alias-file-diff-added-gutter": mix(bg, r.ok, 0.07),
    "--dsw-alias-file-diff-added-marker": r.ok,
    "--dsw-alias-file-diff-deleted-bg": mix(bg, r.warning, 0.14),
    "--dsw-alias-file-diff-deleted-gutter": mix(bg, r.warning, 0.07),
    "--dsw-alias-file-diff-deleted-marker": r.warning,

    /* ---- markdown ---- */
    "--dsw-alias-markdown-citation": r.surface3,
    "--dsw-alias-markdown-code-block": r.surface1,
    "--dsw-alias-markdown-code-block-banner": r.surface2,
    "--dsw-alias-markdown-code-segment-selected": r.surface2,
    "--dsw-alias-markdown-code-segment-unselected": r.surface1,
    "--dsw-alias-markdown-inline-code": r.surface2,
    "--dsw-alias-markdown-placeholder": r.surface2,
    "--dsw-alias-markdown-tag": r.surface2,

    /* ---- scrollbar ---- */
    "--dsw-alias-scrollbar-bg-l1": border,
    "--dsw-alias-scrollbar-bg-l2": mix(border, text, 0.14),
    "--dsw-alias-scrollbar-hover-l1": mix(border, text, 0.28),
    "--dsw-alias-scrollbar-hover-l2": mix(border, text, 0.42),

    /* ---- feedback surfaces ---- */
    "--dsw-alias-switch-thumb": r.secondary,
    "--dsw-alias-toast-bg": r.surface3,
    "--dsw-alias-toast-label": text,
    "--dsw-alias-tooltip-bg": r.surface3,
    "--dsw-alias-tooltip-key-bg": mix(r.surface3, text, 0.18),
    "--dsw-alias-turn-trigger-bg": r.surface2,
    "--dsw-alias-turn-trigger-bg-hover": r.surface3,

    /* ---- specific layer ---- */
    "--dsw-specific-bubble": r.surface1,
    "--dsw-specific-bubble-highlight": r.surface2,
    "--dsw-specific-input-major": r.surface2,
    "--dsw-specific-login-input": r.surface1,
    "--dsw-specific-selector": r.surface3,
    "--dsw-specific-sidebar-fill": r.sidebarFill ?? r.bgDeep,
    "--dsw-specific-sidebar-nav-item-active": alpha(r.primary, 0.16),
    "--dsw-specific-sidebar-nav-item-active-accent": alpha(r.primary, 0.3),
    "--dsw-specific-sidebar-nav-item-hover": alpha(text, 0.06),
    "--dsw-specific-tip": r.surface2,
    "--dsw-menu-surface-fill": r.menuFill ?? alpha(surfaceMix(0.18), 0.92),
    "--dsw-alias-menu-group-header-fill": r.menuFill ?? alpha(surfaceMix(0.1), 0.94),
    "--dsw-specific-menu": r.menuFill ?? alpha(surfaceMix(0.18), 0.92),

    /* ---- settings cards ---- */
    "--dsw-alias-settings-card-fill": r.surface2,
    "--dsw-alias-settings-card-stroke": borderTints.l4,

    /* ---- onboarding ---- */
    "--dsw-alias-onboarding-accent": r.primary,
    "--dsw-alias-onboarding-card-fill": alpha(r.surface2, 0.8),
    "--dsw-alias-onboarding-secondary-fill": r.surface3,
    "--dsw-alias-onboarding-checkbox-border": alpha(text, 0.2),
  };

  for (const name of Object.keys(tokens)) {
    if (!isThemeTokenName(name)) throw new Error(`derivation produced a non-token key ${name}`);
    if (typeof tokens[name] !== "string") throw new Error(`derived token ${name} is not a string`);
  }
  for (const name of REQUIRED_TOKENS) {
    if (!(name in tokens)) throw new Error(`theme "${theme.id}": derived set is missing required token ${name}`);
  }

  const overrides = theme.overrides ?? {};
  for (const name of Object.keys(overrides)) {
    if (!isThemeTokenName(name)) {
      throw new Error(`theme "${theme.id}": override ${name} is not a --dsw-alias-*, --dsw-specific-* or menu-surface token`);
    }
    if (typeof overrides[name] !== "string") {
      throw new Error(`theme "${theme.id}": override ${name} must be a flat CSS string (theme definitions register flattened values, not {light,dark} pairs)`);
    }
  }
  return { ...tokens, ...overrides };
}

/* -------------------------------------------------------------- validation */

/** Contrast pairs the design docs promise; failures make the build fail. */
const CONTRAST_CHECKS = [
  ["--dsw-alias-label-primary", "--dsw-alias-bg-base", 4.5, "primary text on app background"],
  ["--dsw-alias-label-primary", "--dsw-alias-bg-layer-1", 4.5, "primary text on raised surface"],
  ["--dsw-alias-label-primary", "--dsw-alias-bg-layer-2", 4.5, "primary text on nested surface"],
  ["--dsw-alias-label-secondary", "--dsw-alias-bg-base", 3.0, "secondary text on app background"],
  ["--dsw-alias-label-tertiary", "--dsw-alias-bg-base", 3.0, "tertiary text on app background"],
  ["--dsw-alias-label-caption", "--dsw-alias-bg-base", 3.0, "caption text on app background"],
  ["--dsw-alias-brand-primary", "--dsw-alias-bg-base", 3.0, "accent on app background"],
  ["--dsw-alias-state-warn-primary", "--dsw-alias-bg-base", 3.0, "warning on app background"],
  ["--dsw-alias-state-success-primary", "--dsw-alias-bg-base", 3.0, "success on app background"],
  ["--dsw-alias-label-primary-foreground", "--dsw-alias-brand-primary", 3.0, "button label on accent fill"],
  ["--dsw-alias-label-primary", "--dsw-specific-menu", 3.5, "text on menu surface"],
];

/**
 * Validate one theme and return derived tokens plus contrast findings.
 * @param {object} theme
 * @returns {{ tokens: Record<string,string>, errors: string[], warnings: string[] }}
 */
export function prepareTheme(theme) {
  const errors = [];
  const warnings = [];
  if (!/^[a-z0-9][a-z0-9-]*$/.test(theme.id ?? "")) errors.push(`invalid id "${theme.id}" (lowercase letters, digits, hyphens)`);
  if (theme.id === "system" || theme.id === "light" || theme.id === "dark") errors.push(`id "${theme.id}" is reserved by the host`);
  if (theme.colorScheme !== "dark" && theme.colorScheme !== "light") errors.push(`theme "${theme.id}": colorScheme must be "dark" or "light"`);
  if (!theme.label?.en || !theme.label?.zh) errors.push(`theme "${theme.id}": label.en and label.zh are required`);
  if (!theme.description?.en || !theme.description?.zh) errors.push(`theme "${theme.id}": description.en and description.zh are required`);
  if (!Array.isArray(theme.swatches) || theme.swatches.length < 3) errors.push(`theme "${theme.id}": swatches must list at least 3 colours`);

  let tokens = {};
  try {
    tokens = deriveTokens(theme);
  } catch (error) {
    errors.push(error.message);
    return { tokens, errors, warnings };
  }

  // Menu fill can be rgba()/gradient-free string; parse only plain colours.
  for (const [fgName, bgName, minimum, label] of CONTRAST_CHECKS) {
    const fg = tokens[fgName];
    const bgc = tokens[bgName];
    try {
      const ratio = contrast(stripAlpha(fg), stripAlpha(bgc));
      if (ratio < minimum) {
        warnings.push(`${theme.id}: ${label} contrast ${ratio.toFixed(2)}:1 is below ${minimum}:1 (${fgName} on ${bgName})`);
      }
    } catch {
      warnings.push(`${theme.id}: cannot compute contrast for ${label} (${fgName} on ${bgName})`);
    }
  }
  // Success / warning markers on the sidebar and menu surfaces.
  for (const surface of ["--dsw-alias-bg-layer-2", "--dsw-alias-bg-layer-3"]) {
    for (const marker of ["--dsw-alias-state-warn-primary", "--dsw-alias-state-success-primary"]) {
      try {
        const ratio = contrast(stripAlpha(tokens[marker]), stripAlpha(tokens[surface]));
        if (ratio < 3.0) warnings.push(`${theme.id}: ${marker} on ${surface} is ${ratio.toFixed(2)}:1 (< 3:1)`);
      } catch { /* menu gradients are not colours */ }
    }
  }
  return { tokens, errors, warnings };
}

/** Best-effort opaque approximation of rgba()/hex input for contrast math. */
function stripAlpha(value) {
  if (typeof value !== "string") throw new Error("not a colour");
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(value.trim());
  if (rgba) return toHex([+rgba[1], +rgba[2], +rgba[3]]);
  return value;
}
