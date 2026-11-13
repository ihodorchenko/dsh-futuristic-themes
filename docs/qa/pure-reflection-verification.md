# Pure Reflection — live verification (plugin v0.3.0)

**Scope:** the `pure-reflection` theme was reworked from the first white/red pass into the
**City of Glass** palette: cool white/light-grey architecture, Runner's-Vision red and the
functional blue / orange / yellow district colours, with a sharpened radius scale. This check
covers light-scheme registration, the 136-token set, the five-card Appearance row, the new
surfaces/geometry in the real app, the decorative layer and live contrast. The three dark
themes are unchanged and remain covered by the historical
[`verification-report.md`](verification-report.md) (8/8 items, 2026-10-30).

**Date:** 2026-11-13, Europe/Minsk · **Host:** DeepSeek Harness Desktop 0.2.2-rc.3 ·
**Harness:** WKWebView screenshot runner (`tools/webshot`, off-screen window, non-persistent
data store) with in-page diagnostics.

## Environment

| | |
| --- | --- |
| `DSH_HOME` | a private `.dsh-qa` inside the workspace |
| Profile | `web`; `dsh-futuristic-themes` link-installed from the working tree (v0.3.0) |
| Server | `dsh web --no-open --port 51778`; token URL printed at start (redacted) |
| Theme selection | `localStorage['dsh-futuristic-themes:active'] = 'pure-reflection'` + reload |
| Related gate | independent audit `tools/audit-themes.mjs`: **197/197 PASS**, 0 FAIL, 0 WARN, exit 0 (`audit-report.json`) |

## 1. Registration and palette — PASS

Diagnostics after boot with the saved selection:

| probe | observed |
| --- | --- |
| `body[data-dsh-futuristic-theme]` | `pure-reflection` |
| `body[data-dsh-futuristic-effects]` | `on` |
| host theme snapshot | `preference: "pure-reflection"`, `activeId: "pure-reflection"`, `tokenCount: 136`, `themeCount: 6` (4 plugin themes + built-in light + dark) |
| `documentElement.style.colorScheme` | `light` |
| body background / colour | `rgb(239, 241, 244)` (`#EFF1F4`) / `rgb(20, 24, 28)` (`#14181C`) |
| interface font | `Inter, Inter Variable, -apple-system, …` first in the stack |
| sampled tokens | `--dsw-alias-bg-base #EFF1F4`, `bg-layer-1 #FFFFFF`, `bg-layer-2 #FBFCFD`, `bg-layer-3 #E5E9ED`, `brand-primary #E10600`, `label-primary #14181C`, `label-secondary #59646D`, `label-caption #6E7981`, `specific-sidebar-fill #F7F9FB`, `menu-surface-fill rgba(255,255,255,0.98)` — all equal to the derived set |
| boot health | `__DSH_BOOT__` ✓, `__ModuleLoader__` ✓, plugin mounted ✓, 0 collected page errors |

The 136-vs-127 difference is nine explicit tokens the dark-first derivation does not produce:
`--dsw-alias-tooltip-label`, `--dsw-alias-toast-action`, `--dsw-alias-border-selected`,
`--dsw-alias-chart-messages`, `--dsw-alias-chart-system`, `--dsw-alias-chart-tools`,
`--dsw-alias-trajectory-accent`, `--dsw-alias-state-done-primary`,
`--dsw-alias-label-on-color`.

## 2. Appearance row — PASS

With Pure Reflection active, Settings → General renders **five cards** (the four themes plus
Standard appearance). The Pure Reflection card is `data-active="true"` / `aria-pressed="true"`;
the other four are inactive. The new six-colour swatch strip (white-grey, red, blue, orange,
yellow, near-black) is rendered exactly as declared. The row copy is English in this profile
because the plugin ships `en` and `zh` dictionaries; the host UI itself is localized.

Screenshot: [`screenshots/pure-reflection-settings.png`](screenshots/pure-reflection-settings.png).

## 3. Surfaces and geometry — PASS

| surface | observed |
| --- | --- |
| Settings dialog | `rgb(251, 252, 253)` (`#FBFCFD`), dark labels, red selected nav row, red active card border, **4 px** dialog radius |
| Theme cards | **2 px** radius (the host scale is overridden for this theme only), 1 px cold-grey borders; active card grey `#E5E9ED` with the red border |
| Onboarding "Get started" dialog | light scrim (`rgba(20,24,28,0.24)`), red primary button with a white label; observed during the English switch |
| Empty state / composer | off-white canvas (`#EFF1F4`), near-white composer, dark placeholder, red disabled send button (`rgb(225,6,0)`), blue "Preview" badge (`rgb(15,61,122)` on `rgba(30,111,217,0.14)`) |
| Typography | Inter in the settings dialog, empty state and row; IBM Plex Mono is kept for code/terminal roles |

Screenshot: [`screenshots/pure-reflection-empty-state.png`](screenshots/pure-reflection-empty-state.png)
(see the harness limitation about the sidebar in §6).

## 4. Decorative layer — PASS

With the effects switch off, both `#dsh-ft-overlay::before` and `::after` compute
`background-image: none`; with it on, the daylight gradients, the two red L-brackets, the red
chamfer and the blue/orange/yellow district signature are present (visible at the viewport
corners). The effects sheets only paint the overlay pseudo-elements (enforced by audit section
D) and the toggle changes nothing but the `data-dsh-futuristic-effects` attribute, so the
palette is unchanged by the switch. The layer has no animation, no `filter` and no pointer
events.

Screenshot with effects off: [`screenshots/pure-reflection-effects-off.png`](screenshots/pure-reflection-effects-off.png).

## 5. Live contrast — PASS

Computed from the running app (not token arithmetic):

| pair | ratio |
| --- | --- |
| body text on app background | **15.77:1** |
| composer text on composer surface | **17.37:1** |
| sidebar text on sidebar fill | **16.90:1** |
| in-page DOM scan | 66 text nodes in the settings state / 14 in the empty state, **0** below 2.2:1 |

Static semantic matrix from the audit: text 14.62–17.84:1 on the four surfaces, secondary
5.35:1, tertiary 3.76:1, caption 3.94:1, accent 4.39:1, warning 3.80:1, success 3.88:1, info
4.29:1, white button label on the red fill 4.97:1, error 6.47:1. Every pair is above its
contract minimum.

## 6. Limitations

- The private profile has no signed-in account, so the check covers the empty state, dialogs
  and settings. Conversation content, logs, diffs and error banners were not renderable; they
  consume the same checked tokens.
- The WKWebView window is off-screen, which freezes transition-driven reveals (documented in
  the dark-theme report). In the main empty-state screenshot the sidebar is captured in its
  icon-only pre-transition state; the settings screenshot, mounted by a fresh dialog render,
  shows the labels. This is a harness artifact, not a theme defect.
- The locale was switched to English through Settings before the measured runs; the
  account-menu surface was not re-opened in this pass (its tokens are the same surfaces as the
  settings dialog).
- The full 8-item signed-in regression suite was not repeated for the light theme; this rework
  changes tokens, geometry and typography, not the selection/persistence state machine.

## Verdict

**PASS for the v0.3.0 rework.** Pure Reflection registers as a light theme, applies all 136
tokens inline before the shell mounts, renders the City of Glass palette and sharp geometry in
settings and the empty state, keeps the decorative layer overlay-only, and meets the contrast
contract. No defects were found for this change.
