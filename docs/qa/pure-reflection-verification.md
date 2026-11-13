# Pure Reflection — live verification (plugin v0.2.0)

**Scope:** the fourth theme, `pure-reflection`, added to the existing three dark themes. This
check covers what is new: light-scheme registration, the 129-token override, the five-card
Appearance row, light surfaces in the real app, the decorative layer and live contrast.
The three dark themes are covered by the historical [`verification-report.md`](verification-report.md)
(8/8 items, 2026-10-30) and were not re-run for this change.

**Date:** 2026-11-13, Europe/Minsk · **Host:** DeepSeek Harness Desktop 0.2.2-rc.2 ·
**Harness:** WKWebView screenshot runner (`tools/webshot`, off-screen window, non-persistent
data store) with in-page diagnostics.

## Environment

| | |
| --- | --- |
| `DSH_HOME` | a private `.dsh-qa` inside the workspace |
| Profile | `web`; `dsh-futuristic-themes` link-installed from the working tree (v0.2.0) |
| Server | `dsh web --no-open --port 51778`; token URL printed at start (redacted) |
| Theme selection | `localStorage['dsh-futuristic-themes:active'] = 'pure-reflection'` + reload |
| Related gate | independent audit `tools/audit-themes.mjs`: **197/197 PASS**, 0 FAIL, 0 WARN, exit 0 (`audit-report.json`) |

## 1. Registration and palette — PASS

Diagnostics after boot with the saved selection:

| probe | observed |
| --- | --- |
| `body[data-dsh-futuristic-theme]` | `pure-reflection` |
| `body[data-dsh-futuristic-effects]` | `on` |
| host theme snapshot | `preference: "pure-reflection"`, `activeId: "pure-reflection"`, `tokenCount: 129`, `themeCount: 6` (4 plugin themes + built-in light + dark) |
| `documentElement.style.colorScheme` | `light` |
| body background / colour | `rgb(244, 245, 242)` / `rgb(32, 36, 38)` |
| interface font | `Inter, Inter Variable, -apple-system, …` first in the stack |
| sampled tokens | `--dsw-alias-bg-base #F4F5F2`, `bg-layer-1 #FFFFFF`, `bg-layer-2 #F7F8F5`, `bg-layer-3 #E9EBE8`, `brand-primary #E53935`, `label-primary #202426`, `label-secondary #687174`, `label-caption #7E8789`, `specific-sidebar-fill #EEF0ED`, `menu-surface-fill rgba(255,255,255,0.97)` — all equal to the derived set |
| boot health | `__DSH_BOOT__` ✓, `__ModuleLoader__` ✓, plugin mounted ✓, 0 collected page errors |

The 129-vs-127 difference is two explicit tokens the dark-first derivation does not produce:
`--dsw-alias-tooltip-label` and `--dsw-alias-toast-action`.

## 2. Appearance row — PASS

With Pure Reflection active, Settings → General renders **five cards** (the four themes plus
Standard appearance). The Pure Reflection card is `data-active="true"` / `aria-pressed="true"`;
the other four are inactive. The row copy is English in this profile because the plugin ships
`en` and `zh` dictionaries; the host UI itself is localized.

Screenshot: [`screenshots/pure-reflection-settings.png`](screenshots/pure-reflection-settings.png).

## 3. Light surfaces in the app — PASS

| surface | observed |
| --- | --- |
| Settings dialog | white/near-white surface (`rgb(247, 248, 245)`), dark labels, red selected nav row, red active card border, 1 px cold-grey borders |
| Account menu | white translucent panel, dark labels, readable menu surface |
| Onboarding "Get started" dialog | light scrim (`rgba(32,36,38,0.26)`), red primary button with a white label, outline secondary button |
| Empty state / composer | off-white canvas, white composer panel, dark placeholder, pink disabled send button, grey selectors |

Screenshot: [`screenshots/pure-reflection-empty-state.png`](screenshots/pure-reflection-empty-state.png)
(see the harness limitation about the sidebar in §6).

## 4. Decorative layer — PASS

With the effects switch off, `#dsh-ft-overlay::before` computes `background-image: none`; with
it on, the daylight gradients and the two red corner marks are present. A pixel comparison of
the same empty state at threshold 8 reports **4.7 % of pixels differ**, concentrated in the
top-left daylight wash and the viewport edges. The effects sheets only paint the overlay
pseudo-elements (enforced by audit section D) and the toggle changes nothing but the
`data-dsh-futuristic-effects` attribute, so the palette is unchanged by the switch. The layer
has no animation, no `filter` and no pointer events.

Screenshot with effects off: [`screenshots/pure-reflection-effects-off.png`](screenshots/pure-reflection-effects-off.png).

## 5. Live contrast — PASS

Computed from the running app (not token arithmetic):

| pair | ratio |
| --- | --- |
| body text on app background | 14.30:1 |
| composer text on composer surface | 14.02:1 |
| sidebar text on sidebar fill | 13.66:1 |
| in-page DOM scan | 70 text nodes, **0** below 2.2:1 |

Static semantic matrix from the audit: text 13.05–15.65:1 on the four surfaces, secondary
4.57:1, tertiary 3.64:1, caption 3.36:1, accent 3.86:1, warning 3.62:1, success 3.56:1, info
4.94:1, white button label on the red fill 4.23:1. Every pair is above its contract minimum.

## 6. Limitations

- The private profile has no signed-in account, so the check covers the empty state, dialogs,
  menus and settings. Conversation content, logs, diffs and error banners were not renderable;
  they consume the same checked tokens.
- The WKWebView window is off-screen, which freezes transition-driven reveals (documented in
  the dark-theme report). In the main empty-state screenshot the sidebar is captured in its
  icon-only pre-transition state; the settings screenshot, mounted by a fresh dialog render,
  shows the labels. This is a harness artifact, not a theme defect.
- The first runs used the host's Russian locale; the locale was switched to English through
  Settings for the README screenshots. The account-menu and onboarding-dialog checks were
  observed in Russian only.
- The full 8-item signed-in regression suite was not repeated for the light theme; the theme
  addition changes tokens and typography, not the selection/persistence state machine.

## Verdict

**PASS for the added-theme scope.** Pure Reflection registers as a light theme, applies all
129 tokens inline before the shell mounts, is selectable from the row, keeps the light
surfaces and the red accent coherent across settings, menus, dialogs and the empty state, and
meets the contrast contract. No defects were found for this change.
