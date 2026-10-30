# dsh-futuristic-themes

Three cinematic sci-fi themes for **DeepSeek Harness** (Desktop and `dsh web`), as one plugin:

| Theme | Mood | Accent |
| --- | --- | --- |
| **Nostromo Amber** | retro CRT terminal on almost-black warm metal — amber phosphor, monospace, restrained scanlines | `#FFB000` |
| **Omni-tool** | holographic HUD — orange action accent on dark blue glass, cyan secondary signals, faint projection grid | `#FF9A1F` |
| **Renaissance Steel** | cold industrial station console — flat steel surfaces, 1 px frames, almost no glow | `#5FB4E6` |

All three replace the complete `--dsw-*` semantic palette, switch the whole interface to a
monospace stack, and paint an optional decorative layer (scanlines / grid / vignette) that
can be switched off in one click. They are dark-only by design: a cinematic theme should not
change identity with the OS colour scheme.

## Install

### DeepSeek Harness Desktop (recommended)

The Desktop profile is owned by the Electron app, so `dsh plugin --profile desktop …` is
refused by design. Use the app:

1. **Settings → Plugins → add plugin** and enter either
   - the path to this folder: `/Users/<you>/Project/Themes/dsh-futuristic-themes`, or
   - a packed tarball (`pnpm pack` / `npm pack` in this folder, then pick the `.tgz`).
2. Restart the app if the Plugins page asks for it. The plugin appears as
   **dsh-futuristic-themes**.

Manual install (the documented profile mechanism, if the UI is unavailable) is described in
[`docs/INSTALL.md`](../docs/INSTALL.md).

### `dsh web` / CLI profiles

```sh
dsh plugin --profile <profile> add /absolute/path/to/dsh-futuristic-themes
# or from npm, once published:
dsh plugin --profile web add dsh-futuristic-themes
```

Restart `dsh web` afterwards. The plugin's own `cordis.patch.yml` is added to the profile's
bundle stack automatically.

## Use

1. Open **Settings → General**.
2. Under **Futuristic themes**, click one of the three cards.
3. The whole application repaints immediately; the choice survives restarts.
4. **Decorative effects** switches the atmospheric layer (scanlines / holographic grid /
   steel texture) on and off. The palette stays either way.
5. **Standard appearance** returns to the built-in light/dark appearance you used before.

The host's own **Appearance** row keeps working: choosing Light, Dark or System there exits
the theme deliberately — the plugin steps aside and does not resurrect itself on reload.

### How selection is stored

DeepSeek Harness only accepts `light`, `dark` or `system` in its durable `ui-theme.preference`
schema; a third-party theme id written there would make the next boot fail. The plugin keeps
the selected theme in `localStorage` (`dsh-futuristic-themes:active`) and re-applies it after
the host settings have loaded. While a theme is active, the durable preference stays on
`dark` (all three themes are dark), so the first paint of the next boot is already dark and
the theme lands a moment later.

## What the themes change

The plugin registers three definitions through the official third-party extension point
(`ctx.theme.register`) and contributes one Appearance row (`settings.general.item`). Each
theme is a complete override of the semantic token layer — backgrounds, surfaces, borders,
text grades, states, buttons, menus, code blocks, diffs, scrollbars, sidebar, markdown and
settings cards — so no component is left in the default blue-grey palette.

No Host-side services, routes, tools or settings namespaces are registered. The browser half
only imports `react` and the host services it declares (`theme`, `slots`, `locale`).
Decorations are a single `position: fixed` overlay with `pointer-events: none`; they are
disabled automatically for `prefers-reduced-motion` and can be switched off entirely.

### Typography

While a theme is active the interface uses
`"IBM Plex Mono", "JetBrains Mono", "Roboto Mono", "SF Mono", Menlo, Consolas, monospace`
(whichever is installed wins). No font files are bundled. A custom font chosen in
**Settings → General → Fonts** still wins over the theme stack.

## Development

```
src/
  client.template.js     browser-half template (host applies data, no bundler needed)
  base.css               mono stack + overlay container
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

Tested against DeepSeek Harness Desktop **0.2.1-rc.5** and the matching `dsh web`. Requires
the host theme extension point (`@deepseek-ai/dsh-client-ui-theme`) and the
`settings.general.item` slot; both are shipped in 0.2.x. On a host that lacks them the plugin
still loads and registers its themes, but the settings row is skipped with a console warning.

## Uninstall

Remove the plugin from **Settings → Plugins** (Desktop) or
`dsh plugin --profile <profile> remove dsh-futuristic-themes`, then restart. The stored
selection key is left behind harmlessly; before removing, switch to **Standard appearance**
if you want the next launch to use the built-in palette from the first frame.

## License

MIT.
