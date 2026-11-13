# Theme authoring contract — dsh-futuristic-themes

Read this before touching a theme. It describes exactly what a theme author owns, how a
compact palette becomes the complete DSH token set, and how to preview the result without
installing anything into the running app.

## 1. What we are building

A DeepSeek Harness plugin (`dsh-futuristic-themes/`) that registers four cinematic themes with
the host theme registry and adds an Appearance row under **Settings → General**. Three are
dark, one is light:

| id | label | scheme | concept source |
| --- | --- | --- | --- |
| `nostromo-amber` | Nostromo Amber | dark | `Nostromo-Amber.md` + amber panel in the concept image |
| `omni-tool` | Omni-tool | dark | `Omni-tool.md` + holographic panel in the concept image |
| `pure-reflection` | Pure Reflection | light | `Pure-Reflection.md` (standalone brief, no concept image) |
| `renaissance-steel` | Renaissance Steel | dark | `Renaissance-Steel.md` + steel panel in the concept image |

The concept image is `Три футуристические темы DeepSeek Harness.png` in the workspace root (it
predates Pure Reflection). The four markdown files are the authoritative design briefs
(Russian). Read them.

## 2. Files you own

Designer of `<id>` writes **only**:

- `dsh-futuristic-themes/src/themes/<id>.json` — palette + copy
- `dsh-futuristic-themes/src/effects/<id>.css` — decorative layer

Never touch another theme's files, `src/client.template.js`, `src/base.css`, `src/row.css`,
`scripts/`, `lib/`, `package.json` or the workspace root. If something outside your files
looks wrong, report it instead of editing it.

Typography and shape are the shared layers: `src/base.css` gives the dark themes the mono
stack and gives `pure-reflection` Inter for interface copy with IBM Plex Mono kept for logs,
code and technical data. It also sharpens the host radius scale for `pure-reflection` only
(`0/1/2/3/4/4 px` instead of `4–28 px`) so the UI reads as planar architecture. A new **light**
theme needs its own rule there; do not paint host components.

`build/` is generated; do not hand-edit it. Concurrent preview runs write different files
there, which is safe.

## 3. Theme JSON schema

```jsonc
{
  "id": "nostromo-amber",              // lowercase, hyphens, must match file name
  "colorScheme": "dark",               // "dark" | "light"; it is registered with the host
  "label":      { "en": "...", "zh": "..." },
  "tagline":    { "en": "ALIEN / ROMULUS INSPIRED", "zh": "..." },
  "description":{ "en": "...", "zh": "..." },   // one sentence, shown in the row
  "accent": "#FFB000",                 // card accent; usually roles.primary
  "swatches": ["#0B0804", "#FFB000", "#FFD98A", "#FF4A1C", "#7FBF3F"], // 4–6 colours for the picker card
  "roles": { ... },                    // see below — the only required colour input
  "overrides": { "--dsw-alias-...": "..." },   // optional exact token overrides
  "preview": {
    "notification": { "kind": "warning" | "info" | "success", "text": "..." },
    "metrics": "bars" | "gauge"
  }
}
```

`roles` are opaque `#rrggbb` colours. Everything else in the DSH token set is derived from
them by `scripts/lib/derive.mjs`, so a theme is always complete.

| role | meaning | required |
| --- | --- | --- |
| `bg` | app base background (conversation column) | ✓ |
| `bgDeep` | deeper background behind the app (window chrome / gradient base) | optional, defaults to `bg` |
| `surface1` | raised surface: cards, terminal frame, code blocks | ✓ |
| `surface2` | second surface layer: inputs, bubbles, popovers, inline code | ✓ |
| `surface3` | third layer: menus, tooltips, tags, elevated rows | ✓ |
| `overlay` | overlay fill (`--dsw-alias-bg-overlay`) | ✓ |
| `border` | base border colour; all four border tints derive from it | ✓ |
| `dim` | disabled / very quiet marks | ✓ |
| `text` | primary text | ✓ |
| `secondary` | secondary text (labels, metadata) | ✓ |
| `primary` | brand accent: selected states, primary buttons, focus ring | ✓ |
| `bright` | brighter accent for hover / focus / active | ✓ |
| `warning` | warnings and errors | ✓ |
| `ok` | success / confirmations | ✓ |
| `info` | secondary informational signal (charts, connection status) | ✓ |
| `sidebarFill` | raw CSS background for the sidebar, may be a gradient | optional |
| `menuFill` | raw `rgba()` fill for menus | optional |

Derivation summary (for debugging only — don't reimplement it):

- border tints: `l1 = border @45%`, `l2 = border @70%`, `l3 = border`, `l4 = mix(border, text, 20%)`
- text grades: `secondary` as given, `tertiary = mix(secondary, dim, 50%)`,
  `caption = mix(secondary, bg, 35%)`, `dimmed = mix(dim, bg, 35%)`
- buttons / interaction fills / states / diff / markdown / scrollbar / specific layer all
  derive from the same roles (see `scripts/lib/derive.mjs` for exact formulas)
- `overrides` is the escape hatch when a scale value looks wrong: override the final token
  directly. Overrides must be flat CSS strings (`register()` takes flattened values, **not**
  `{light,dark}` pairs — the pair shape is for `overrideTokens` layers and silently becomes
  `[object Object]` in a registered theme).

The build prints contrast warnings (text ≥ 4.5:1 on app/raised surfaces, secondary ≥ 3:1,
accents ≥ 3:1, button label on accent ≥ 3:1). Warnings do not fail the build, but a theme
that leaves obvious warnings is not done — fix the palette or add an override.

The derivation was shaped by the three dark themes, so a light theme needs a handful of
explicit overrides where mixing towards `bg` washes a value out or a dark-theme convention
does not carry over. `pure-reflection.json` documents all 24: white label/switch thumb, dark
tooltip and toast (the host keeps both dark in light mode), a darker error red and button
hover for readable white labels, a caption that stays ≥ 3:1, a 24 % modal scrim, and the
district tokens that do not exist in the role schema — blue links/info/charts/business badge,
yellow technical charts, red selected border and trajectory, amber “done”. Its warning role is
`#D9480F` rather than the brief's `#E16A32`, because the brief colour measures only 2.78:1 on
`surface3` while this one keeps ≥ 3:1 on every light surface; the brighter district orange
`#F76707` is used in the picker swatch and the decorative signature, not as text.

## 4. Effects CSS contract

`src/effects/<id>.css` is inlined into the plugin's stylesheet and only applies while:

```css
body[data-dsh-futuristic-theme="<id>"][data-dsh-futuristic-effects="on"] ...
```

The only element you may paint is the plugin-owned overlay and its two pseudo-elements:

```css
#dsh-ft-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 2147483000; display: none; }
#dsh-ft-overlay::before, #dsh-ft-overlay::after { content: ""; position: absolute; inset: 0; pointer-events: none; }
```

Rules:

- Paint only `#dsh-ft-overlay::before` / `::after`. Do **not** style app components or use
  their hashed class names; do not touch `body`, `.dshft-*` or the app frame.
- Keep it decorative and subtle: scanlines/grids ≤ ~0.15 alpha, vignettes ≤ ~0.5 at the
  edges, glows ≤ ~0.1 alpha. Text must stay readable — this layer sits above the app.
- No pointer events, no layout, no `filter` on the page, no constant full-screen animation.
  Short, rare animations are acceptable only if they are `prefers-reduced-motion` safe; the
  safest choice is no animation at all.
- `var(--dsw-alias-*)` and `var(--dsw-specific-*)` resolve inside the overlay, so you can
  express colours through the theme's own tokens.
- The effects toggle must remain meaningful: with the switch off the theme should still look
  finished, only less atmospheric.

## 5. Design intent per theme (from the briefs and the concept image)

**Nostromo Amber** — retro-CRT onboard terminal: almost-black warm metal, amber phosphor,
monospace type, restrained glow, sharp corners, utilitarian and slightly ominous. The
concept image shows scanlines, amber frames, a warning banner in hot red-orange, green "OK"
status. Keep long-form text free of glow. Reference tokens from the brief:
`bg #0B0804`, `surface #14100A`, `border #3A2A10`, `dim #8A5A00`, `primary #FFB000`,
`bright #FFCC33`, `text #FFD98A`, `warning #FF4A1C`, `ok #7FBF3F`.

**Omni-tool** — modern sci-fi holographic HUD: orange action accent on dark blue glass,
cold cyan secondary signals, faint projection grid, glassy panels with a local halo. More
energetic than Nostromo but still clean for daily work. Reference tokens from the brief:
`bg #0A0D12` (translucent if the environment supports it — as a token it is solid), surface
`#121821`, border `#FF9A1F` @30%, `primary #FF9A1F`, `bright #FFC266`, `text #F2E3C9`,
`secondary` signal `#3FD0FF`, warning `#FF4A3D`. Orange commands actions; cyan is secondary
signal, never a competing accent everywhere.

**Pure Reflection** — the one light theme: the sterile white / light-grey City of Glass, with
Runner's-Vision red as the navigation and action accent and functional blue / orange / yellow
district colours. Flat surfaces, thin 1 px borders, sharp `0–4 px` radii, no scanlines, no glow
and no motion; decoration is a daylight wash, two red L-brackets, a red chamfer and a small
blue/orange/yellow district signature. Reference tokens: `bg #EFF1F4`, `surface #FFFFFF`,
`surfaceAlt #E5E9ED`, `border #C9D0D6`, `dim #8A939B`, `text #14181C`, `secondary #59646D`,
`primary #E10600`, `bright #FF2D2D`, `ok #1B8A4B`, `warning #D9480F`, `info #1E6FD9`, error
`#B00020`. The implementation maps the district colours onto the semantics the host exposes:
red for selection/focus/primary action, blue for links/info/charts and the business badge,
orange for warnings, yellow for technical charts and the district signature, green for success.
The full direction is in [`design-briefs/Pure-Reflection-Addendum.md`](design-briefs/Pure-Reflection-Addendum.md).

**Renaissance Steel** — restrained industrial console, cold grey-blue, flat surfaces, 1 px
frames, almost no glow, prioritising hierarchy and long-session comfort. Concept image
shows double thin cyan frames, steel labels, small gauges. Reference tokens from the brief:
`bg #07090C`, `surface #0E1318`, `border #26323D`, `dim #4F6A80`, `primary #5FB4E6`,
`bright #9AD7FF`, `text #BCD0E0`, `secondary #8A99A6`, `warning #E2553F`, `ok #5FD3B0`.

## 6. Preview and check loop

Run from `dsh-futuristic-themes/`:

```sh
# validate + regenerate this theme's preview page (fails on schema errors, prints contrast warnings)
$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node scripts/preview.mjs --only <id>

# screenshot it (WKWebView, no browser automation permissions needed)
cd <repo>/tools && \
  ./webshot "file://<repo>/dsh-futuristic-themes/build/theme-<id>.html" \
  /tmp/preview-<id>.png 1340 1100 1.5
```

Then inspect `/tmp/preview-<id>.png` with the image-reading tool. Iterate until the mock
matches the brief and the concept image. The mock mirrors the real app's token usage:
window frame, sidebar (`--dsw-specific-sidebar-fill`), terminal surface, metrics, status
bar, notification and the Settings appearance row.

Node lives outside PATH in this environment; always call it with the absolute path above.

## 7. Definition of done for a theme

- JSON validates; no remaining contrast warnings that hide readable-text failures.
- A **light** theme additionally: every surface step and fine border is legible on white,
  white labels on accent fills and on the switch thumb are explicit, dark tooltips/toasts do
  not inherit light-theme values, error text keeps ≥ 4.5:1 (the light theme overrides the
  derived warning-orange error to `#B00020`), and Runner's-Vision red is not the only semantic
  colour — district blue/orange/yellow stay reserved for information, warnings and technical
  data.
- The preview screenshot reads as the intended theme at a glance (colour identity, contrast,
  borders, accents) and does not fight the concept image's mood.
- Effects layer adds atmosphere but looks fine when the switch is off.
- Copy (`en`, `zh`) is correct, short and specific; `tagline` is the concept strap line.
- You report back: roles chosen (and why they diverge from the brief), overrides added,
  remaining warnings, and the preview screenshot path.

## 8. Composite mode (plugin-level)

`Composite` is a mode in the Appearance row, not a theme definition. The four registered token
sets remain the only palettes; the mode maps the host Light / Dark / System scheme onto one of
them per scheme.

- State: `localStorage['dsh-futuristic-themes:composite'] = { enabled, light, dark }`, where
  `light`/`dark` are theme ids or `null` (built-in).
- The host's built-in **Light / Dark / System** choice is the scheme input. With Composite
  enabled it must not be treated as "exit the theme"; `theme/change` maps the scheme to the
  configured id and re-asserts the theme. `System` follows the resolved scheme and the OS
  `prefers-color-scheme` changes.
- An empty slot applies the built-in appearance for that scheme. If both slots are empty the
  mode turns itself off and Standard appearance takes over.
- Selecting a normal theme card or Standard appearance disables Composite but keeps the saved
  mappings; a later enable reuses them.
- The host's built-in cubes do not stay highlighted while a mapped theme is active (the host
  reports the theme id); the Composite card and its two selectors are the indicator.
- Theme authors do not touch this layer: it lives in `src/client.template.js` and `src/row.css`
  and changes no theme JSON, token derivation or effects sheet. The test matrix is in
  [`docs/qa/composite-verification.md`](qa/composite-verification.md).
