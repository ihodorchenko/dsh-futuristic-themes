# dsh-futuristic-themes

Four cinematic themes for **DeepSeek Harness** (Desktop and `dsh web`), as one plugin, plus a
**Composite** mode that pairs a light and a dark theme with the host Light / Dark / System
appearance:

| Theme | Scheme | Mood | Accent |
| --- | --- | --- | --- |
| **Nostromo Amber** | dark | retro CRT terminal on almost-black warm metal — amber phosphor, monospace, restrained scanlines | `#FFB000` |
| **Omni-tool** | dark | holographic HUD — orange action accent on dark blue glass, cyan secondary signals, faint projection grid | `#FF9A1F` |
| **Pure Reflection** | light | the City of Glass: white / light-grey architecture, Runner's-Vision red, functional blue/orange/yellow districts, sharp geometry; Inter + technical mono | `#E10600` |
| **Renaissance Steel** | dark | cold industrial station console — flat steel surfaces, 1 px frames, almost no glow | `#5FB4E6` |

All four replace the complete `--dsw-*` semantic palette and paint an optional decorative
layer (scanlines / grid / steel bezel / daylight, red brackets and a district signature) that
can be switched off in one click. The three dark themes switch the whole interface to a
monospace stack; Pure
Reflection uses Inter for interface copy, keeps IBM Plex Mono for logs, code and technical
data, and sharpens the host radius scale to 0–4 px. The three dark themes are dark-only by
design — a cinematic terminal should not change identity with the OS colour scheme; Pure
Reflection is the light counterpart.

## Install

### DeepSeek Harness Desktop (recommended)

The canonical source is the GitHub repository
[`ihodorchenko/dsh-futuristic-themes`](https://github.com/ihodorchenko/dsh-futuristic-themes);
this package is its `dsh-futuristic-themes/` folder. The Desktop profile is owned by the
Electron app, so `dsh plugin --profile desktop …` is refused by design — use the repository
script or the in-app plugin manager:

```sh
git clone https://github.com/ihodorchenko/dsh-futuristic-themes.git
cd dsh-futuristic-themes
tools/install-desktop.sh              # install from GitHub into the Desktop profile
tools/install-desktop.sh --update     # later: update to the latest GitHub commit
```

In-app alternative: **Settings → Plugins → add plugin** with the repository URL / package
spec `github:ihodorchenko/dsh-futuristic-themes#path:/dsh-futuristic-themes`, or a packed
tarball of this folder. Full manual procedure, updater and rollback are in
[`docs/INSTALL.md`](../docs/INSTALL.md).

### `dsh web` / CLI profiles

```sh
dsh plugin --profile <profile> add "github:ihodorchenko/dsh-futuristic-themes#path:/dsh-futuristic-themes"
# or from a local checkout:
dsh plugin --profile <profile> add /absolute/path/to/dsh-futuristic-themes
```

Restart `dsh web` afterwards. The plugin's own `cordis.patch.yml` is added to the profile's
bundle stack automatically. Git installs pin the exact commit; re-add the package or run
`pnpm update dsh-futuristic-themes` in the profile to move to a newer one.

## Use

1. Open **Settings → General**.
2. Under **Futuristic themes**, click one of the four theme cards, or **Composite** to pair a
   light and a dark theme.
3. The whole application repaints immediately; the choice survives restarts.
4. **Composite** (when enabled) shows **Light scheme** and **Dark scheme** selectors. Each can
   be one of the four themes or **Built-in**. The host **Settings → Appearance** choice then
   picks the slot: Light, Dark or the resolved System scheme. An empty slot uses the built-in
   appearance; if both slots are empty, Composite turns itself off.
5. A normal theme card (or **Standard appearance**) leaves Composite and applies that choice
   manually; the mappings stay saved for the next enable.
6. **Decorative effects** switches the atmospheric layer (scanlines / holographic grid /
   steel bezel / daylight, red brackets and the district signature) on and off. The palette
   stays either way.
7. **Standard appearance** returns to the built-in light/dark appearance you used before.

The host's own **Appearance** row keeps working. With Composite off, choosing Light, Dark or
System there exits the manual theme deliberately — the plugin steps aside and does not
resurrect itself on reload. With Composite on, the same choice is the scheme input and maps to
the configured theme (or the built-in appearance for an empty slot).

### How selection is stored

DeepSeek Harness only accepts `light`, `dark` or `system` in its durable `ui-theme.preference`
schema; a third-party theme id written there would make the next boot fail. The plugin keeps
the selected theme in `localStorage` (`dsh-futuristic-themes:active`) and re-applies it after
the host settings have loaded, before the app shell mounts. The durable preference stays the
built-in value the user last chose, so the host's boot splash follows that scheme; the theme
lands a moment later and the shell paints already themed.

Composite stores its state next to it (`dsh-futuristic-themes:composite`:
`{ enabled, light, dark }`). The host preference stays `light|dark|system`, so the first paint
already has the right brightness; on boot the plugin reads the scheme and applies the mapped
theme before the shell. A normal theme card or Standard appearance disables Composite but keeps
the saved mappings; emptying both slots also disables it automatically.

## What the themes change

The plugin registers four definitions through the official third-party extension point
(`ctx.theme.register`) and contributes one Appearance row (`settings.general.item`). Each
theme is a complete override of the semantic token layer — backgrounds, surfaces, borders,
text grades, states, buttons, menus, code blocks, diffs, scrollbars, sidebar, markdown and
settings cards — so no component is left in the default blue-grey palette.

The **Composite** card is plugin logic on top of those four definitions, not a fifth token set:
it maps the host Light / Dark / System scheme onto one of the registered theme ids, or onto the
built-in appearance when a slot is empty. It uses the same `ctx.theme.setTheme()` path, reacts
to `theme/change` and to the OS `prefers-color-scheme`, and never writes a theme id into the
host preference. The full test matrix is in
[`docs/qa/composite-verification.md`](../docs/qa/composite-verification.md).

No Host-side services, routes, tools or settings namespaces are registered. The browser half
only imports `react` and the host services it declares (`theme`, `slots`, `locale`).
Decorations are a single `position: fixed` overlay with `pointer-events: none`; they are
disabled automatically for `prefers-reduced-motion` and can be switched off entirely.

Pure Reflection is the one light theme, so it registers 136 tokens (127 derived + 9
light/district tokens) and carries 24 documented overrides for
values the dark-first derivation cannot express: white labels on red fills and on the switch
thumb, host-dark tooltips/toasts, a darker error red and button hover, a readable caption
grade, a lighter modal scrim, and the district tokens the role schema does not expose — blue
links/info/charts and the Preview badge, yellow technical charts, red selected border and
trajectory, amber “done”. Its warning role is `#D9480F` rather than the brief's `#E16A32`,
which measures only 2.78:1 on the secondary surface; the brighter district orange `#F76707`
appears in the picker swatch and effect signature, not as text.

### Typography

While a dark theme is active the interface uses
`"IBM Plex Mono", "JetBrains Mono", "Roboto Mono", "SF Mono", Menlo, Consolas, monospace`
(whichever is installed wins). Pure Reflection uses
`"Inter", -apple-system, "Segoe UI", …` for interface copy and keeps the mono stack for code,
logs and terminal. No font files are bundled. A custom font chosen in
**Settings → General → Fonts** still wins over either theme stack.

## Development

```
src/
  client.template.js     browser-half template (host applies data, no bundler needed)
  base.css               per-theme typography + overlay container
  row.css                Settings appearance row
  effects/*.css          per-theme decorative layer (overlay-only)
  themes/*.json          palette roles + copy (one file per theme)
scripts/
  build.mjs              validate + derive tokens + inline into lib/client.js
  preview.mjs            render pixel-styled previews of each theme
  lib/derive.mjs         role → complete --dsw-* token derivation + contrast checks
```

```sh
NODE=/Users/<you>/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node
$NODE scripts/build.mjs            # build lib/client.js
$NODE scripts/build.mjs --check    # validate only
$NODE scripts/preview.mjs          # build/preview.html + build/theme-<id>.html
```

`lib/client.js` is committed so the plugin works without a build step on the user's machine.

## Compatibility

Tested against DeepSeek Harness Desktop **0.2.1-rc.5** and the matching `dsh web`; the light
theme and the Composite mode were additionally smoke-tested live on Desktop **0.2.2-rc.2**
and **0.2.2-rc.3**. Requires the host
theme extension point (`@deepseek-ai/dsh-client-ui-theme`) and the `settings.general.item`
slot; both are shipped in 0.2.x. On a host that lacks them the plugin still loads and
registers its themes, but the settings row is skipped with a console warning.

## Uninstall

Remove the plugin from **Settings → Plugins** (Desktop) or
`dsh plugin --profile <profile> remove dsh-futuristic-themes`, then restart. The stored
selection key is left behind harmlessly; before removing, switch to **Standard appearance**
if you want the next launch to use the built-in palette from the first frame.

## License

MIT.
