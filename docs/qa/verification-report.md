# End-to-end verification — dsh-futuristic-themes

> Historical report for the three dark themes (v0.1.3, 2026-10-30). The fourth theme,
> Pure Reflection, is covered by [`pure-reflection-verification.md`](pure-reflection-verification.md).

**Task:** `task-5` · **Verifier:** `theme-verifier` (independent of the designers)
**Date:** 2026-10-30, Europe/Minsk (evening) · **Harness:** WKWebView step driver + independent audit
**Plugin under test:** `dsh-futuristic-themes` @ final palettes, `lib/client.js` rebuilt 20:22 (51 243 B); D1/D2 fixes re-verified — see §7
**Private environment:** `DSH_HOME=<repo>/.dsh-qa`, `dsh web --no-open --port 51778`
**Final verdict: PASS** — all 8 verification items pass, and the two previously reported **LOW** defects
(D1 boot-restore grace window, D2 missing `:focus-visible` styling) were **fixed and re-verified** on the rebuilt
bundle (§7). No open defects; no critical/high/medium defects found.

> Read first: [`docs/THEME-CONTRACT.md`](../THEME-CONTRACT.md) · static audit baseline: [`audit-baseline.md`](audit-baseline.md)

---

## 0. TL;DR

| | |
| --- | --- |
| Items verified | 8 / 8 (fresh boot, three themes × two activation paths, persistence/flash, exit path, effects switch, row usability, regressions, accessibility contrast) |
| Result | **8 PASS** (2 with caveats), **0 FAIL** |
| Static audit (independent harness) | **159 checks — 159 PASS, 0 FAIL, 0 WARN**, exit 0 (`audit-report.json`) |
| Live token truth | All **127 derived tokens × 3 themes** are byte-identical to `deriveTokens(final JSON)` in the served bundle |
| Defects | D1 **FIXED** (re-verified, §7.1) · D2 **FIXED** (rule + token resolution re-verified, §7.2; WKWebView programmatic-focus limitation documented) — no open defects |
| Blockers | none |
| Recommendation | **Ship.** Both previously reported LOW defects are fixed and independently re-verified; final verdict unchanged (PASS). |

---

## 1. Scope: what "done" means for this task

`task-5` asks for an independent end-to-end verification of the integrated plugin against a real `dsh web` instance:
fresh-boot state, per-theme activation via the settings card **and** via persisted `localStorage` + reload,
reload persistence (flash behaviour), the built-in-appearance exit path, the decorative-effects switch,
settings-row usability, regression sanity for dialogs/menus/tooltips/composer, and accessibility contrast from
*computed* styles. The verification must not modify the plugin, the Lead's server (51777), or shared tooling, and
must report real defects with reproduction steps rather than confirmations.

The Lead additionally asked to re-verify explicitly:
(a) activate theme → immediately click built-in Dark (within 4 s) → must stay built-in, selection cleared, and
after reload the built-in choice persists;
(b) boot restore = set `localStorage` + reload → theme applied with no interaction, tokens applied inline (not only CSS);
(c) fresh boot with no saved selection = no body attributes, built-in palette.
The desktop-profile install path is out of scope (owned by the Lead).

---

## 2. Build and environment under test

### 2.1 Final artifact snapshot (sha256, first 16 hex chars)

| artifact | size | sha256 |
| --- | --- | --- |
| `src/themes/nostromo-amber.json` | 1729 B | `f9618e257cae90f0…` |
| `src/themes/omni-tool.json` | 1663 B | `02e3a71dfc55d300…` |
| `src/themes/renaissance-steel.json` | 1363 B | `38dd78e41de2a032…` |
| `src/effects/nostromo-amber.css` | 1411 B | `4fab400cd0992d88…` |
| `src/effects/omni-tool.css` | 1655 B | `a1f870b35eeb07b9…` |
| `src/effects/renaissance-steel.css` | 3004 B | `e7316673173d7da5…` |
| `src/effects/base.css` | 271 B | `618196140cc7f632…` |
| `src/base.css` | 1320 B | `80e893c757bd57d4…` |
| `src/row.css` | 3114 B | `11044ff69968851f…` |
| `src/client.template.js` | 17530 B | `543419e64f2ce4ab…` |
| `lib/client.js` | 51243 B | `46f2ec1348acc019…` |
| `lib/index.js` | 361 B | `61af3483cd82d639…` |
| `package.json` | 861 B | `4c2204ab6f702565…` |
| `cordis.patch.yml` | 239 B | `f743d78ae8b05ff5…` |
| `skin.json` | 182 B | `a4d46c0826cb7045…` |
| `scripts/build.mjs` | 6367 B | `030f9022f8e56171…` |
| `scripts/preview.mjs` | 17109 B | `da712d808d5c1d4c…` |
| `scripts/lib/derive.mjs` | 18448 B | `3a6959924a607c3e…` |

`lib/client.js` is the bundle the private web server actually serves (link-installed plugin; the server was started
**after** the final `scripts/build.mjs` run, and no source file changed after the server start).

### 2.2 Static audit gate (independent harness)

```sh
NODE=$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node
"$NODE" <repo>/tools/audit-themes.mjs
# SUMMARY: 159 checks — 159 PASS, 0 FAIL (hard), 0 WARN, 0 INFO, 0 SKIP
# EXIT CODE: 0 (no hard failures)
```

Machine-readable report: [`audit-report.json`](audit-report.json) (last run `2026-10-30T17:22:52Z`, 159/159 PASS, exit 0; identical result on the rebuilt D1/D2 bundle).

### 2.3 Browser/runtime environment

| | |
| --- | --- |
| DSH | `0.2.1-rc.5`, app `DeepSeek Harness` |
| CLI | `/Applications/AI/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh` |
| DSH_HOME | `<repo>/.dsh-qa` (private, inside the workspace) |
| Profile | `web`; `dsh-futuristic-themes` link-installed from the workspace checkout |
| Server | `dsh web --no-open --port 51778`; original E2E job `bash-e6bf3a7e16494430` (started 18:43); restarted for the D1/D2 re-verification as job `bash-cb405c247a47472f` (20:23, new token URL) |
| URL | `http://127.0.0.1:51778/?token=<redacted>` (token cookie is set by the first load; every run re-uses the token URL) |
| Screenshot harness | `<repo>/tools/webshot` (WKWebView, 1600×1000 CSS px, offscreen window, non-persistent website data store) |
| Step driver | native sequential steps: `./webshot "<url>" out.png 1600 1000 <wait> "@/path/steps.json" <smallWait> "<diagJs>"` |
| Reproduced artifacts | step scripts and diagnostic JS copied to [`steps/`](steps/); screenshots to [`screenshots/`](screenshots/) |

Important harness properties that shaped the method:

- the WKWebView data store is **non-persistent**, so `localStorage` survives a `location.reload()` **inside one run**
  but not between separate `webshot` invocations — persistence is therefore tested exactly as the task describes
  (set state → reload → assert in the same session);
- the window is positioned off-screen, which makes WebKit throttle CSS transitions/animations at `currentTime = 0`
  (verified: `document.getAnimations()` reports `running / time 0`). This is a **harness artifact, not an app defect**;
  it means screenshots taken after switching a theme inside an already-open Settings dialog show the cards'
  un-transitioned (pre-theme) surface for up to 200 ms of real time. Where a screenshot is used as design evidence the
  dialog is re-opened **after** the theme is active (transition-free mount), and computed styles are used as the
  authoritative check;
- WKWebView console output is not captured by the harness (no `WKScriptMessageHandler` for console). Boot health is
  therefore asserted functionally: `window.__DSH_BOOT__`, `__ModuleLoader__`, plugin mounted, host theme snapshot
  (5 registered themes incl. the 3 plugin themes, 127 active tokens), settings row rendering, no error boundary, and
  an in-page error collector installed after load (0 errors across all runs).

### 2.4 Live token truth cross-check

For each theme the page was booted with `localStorage['dsh-futuristic-themes:active']=<id>` + reload, then **every**
`--dsw-*` property was read from `document.body.style` and compared with `deriveTokens()` recomputed from the current
`src/themes/<id>.json` (Node, same plugin library):

```text
=== nostromo-amber: live=127 expected=127 mismatches=0 missing=0 extra=0
  IDENTICAL: all 127 derived tokens match body inline values; host: {"preference":"nostromo-amber","activeId":"nostromo-amber","tokenCount":127,"themeCount":5}
=== omni-tool: live=127 expected=127 mismatches=0 missing=0 extra=0
  IDENTICAL: all 127 derived tokens match body inline values; host: {"preference":"omni-tool","activeId":"omni-tool","tokenCount":127,"themeCount":5}
=== renaissance-steel: live=127 expected=127 mismatches=0 missing=0 extra=0
  IDENTICAL: all 127 derived tokens match body inline values; host: {"preference":"renaissance-steel","activeId":"renaissance-steel","tokenCount":127,"themeCount":5}
```

This is the strongest single integration check: it proves the served bundle, the final palettes and the token
derivation all agree, not merely that "some colour applied".

### 2.5 Final palette roles (source of truth for live screenshots)

| theme | bg | bgDeep | surface1 | surface2 | surface3 | border | text | secondary | primary | bright | warning | ok | info |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| nostromo-amber | `#0B0804` | `#070502` | `#161008` | `#20170A` | `#2C2111` | `#3A2A10` | `#FFD98A` | `#E0AC45` | `#FFB000` | `#FFCC33` | `#FF4A1C` | `#7FBF3F` | `#ECC469` |
| omni-tool | `#0A0D12` | `#06080D` | `#121821` | `#182130` | `#1F2B3C` | `#7A4E18` | `#F2E3C9` | `#A9BCD4` | `#FF9A1F` | `#FFC266` | `#FF4A3D` | `#31DBC5` | `#3FD0FF` |
| renaissance-steel | `#07090C` | `#05070A` | `#0E1318` | `#121920` | `#18222C` | `#26323D` | `#BCD0E0` | `#8A99A6` | `#5FB4E6` | `#9AD7FF` | `#E2553F` | `#5FD3B0` | `#6FA8C8` |

---

## 3. Results per verification item

Legend: **PASS** = verified with an assertion/diagnostic; **PASS\*** = passes but one sub-aspect has a documented
limitation; screenshots are relative to this directory.

### Item 1 — Fresh page (no selection) — **PASS**

Run [`steps/43-fresh-boot-final.json`](steps/43-fresh-boot-final.json), screenshot
[`screenshots/01-fresh-boot-built-in-dark.png`](screenshots/01-fresh-boot-built-in-dark.png),
fresh settings state [`screenshots/02-settings-general-4-cards.png`](screenshots/02-settings-general-4-cards.png).

| assertion | observed |
| --- | --- |
| no theme body attributes | `body[data-dsh-futuristic-theme]` = `null`, `body[data-dsh-futuristic-effects]` = `null` |
| built-in dark appearance | body background `rgb(21, 21, 23)` (`#151517`), `color-scheme: dark`, no inline `--dsw-*` overrides on body (`tokenCount: 0`) |
| plugin loaded, no breaking errors | `window.__DSH_BOOT__` ✓, `window.__ModuleLoader__` ✓, plugin mounted ✓, host theme snapshot: `themeCount: 5`, `activeId: "dark"`; error collector empty |
| overlay not painting/intercepting | `#dsh-ft-overlay` present, `display: none`; `document.elementFromPoint(centre)` returns the app element, never the overlay |
| plugin row present in Settings → General | Settings dialog General shows the **Futuristic themes** row with 4 cards; host Appearance row above it (`4 / standard` active) |

Expected standard appearance ("Standard appearance — Built-in light / dark — Active") is the active card on a fresh
profile; the three theme cards are inactive.

### Item 2 — Each of the three themes — **PASS**

Two independent activation paths were exercised for every theme:

**Path A — UI card click** (account menu → Settings → `.dshft-card` matching the label).
Runs `03/05/07` (dialog open, themed) and `04/06/08` (dialog closed, app shell).

**Path B — persisted `localStorage` + reload** (`localStorage.setItem('dsh-futuristic-themes:active', id); location.reload()`).
Runs `10/11/12`; full-token equality runs `45/46/47`.

| expected | nostromo-amber | omni-tool | renaissance-steel |
| --- | --- | --- | --- |
| `body[data-dsh-futuristic-theme]` | `nostromo-amber` | `omni-tool` | `renaissance-steel` |
| `body[data-dsh-futuristic-effects]` | `on` | `on` | `on` |
| inline `--dsw-alias-bg-base` (body.style) | `#0B0804` | `#0A0D12` | `#07090C` |
| computed body background | `rgb(11, 8, 4)` | `rgb(10, 13, 18)` | `rgb(7, 9, 12)` |
| host snapshot | `preference=theme id`, `tokenCount=127`, `themeCount=5` | same | same |
| `localStorage['…:active']` after click | `nostromo-amber` | `omni-tool` | `renaissance-steel` |
| monospace typography | `IBM Plex Mono, JetBrains Mono, Roboto Mono, SF Mono, Menlo, Consolas, monospace` first in the stack | same | same |
| all 127 derived tokens equal live body tokens | ✓ 0 mismatches | ✓ 0 mismatches | ✓ 0 mismatches |

"Colors visibly applied" evidence per theme:

- settings dialog: [`03-nostromo-settings.png`](screenshots/03-nostromo-settings.png),
  [`05-omni-settings.png`](screenshots/05-omni-settings.png),
  [`07-steel-settings.png`](screenshots/07-steel-settings.png) — themed dialog surface, borders, mono text,
  active card highlighted with the theme accent, swatches in theme colours;
- app shell / sidebar / composer: [`04-nostromo-app.png`](screenshots/04-nostromo-app.png),
  [`06-omni-app.png`](screenshots/06-omni-app.png), [`08-steel-app.png`](screenshots/08-steel-app.png) —
  chat shell, sidebar fill (`--dsw-specific-sidebar-fill`, including the nostromo/omni gradients), composer surface,
  model selector, all recoloured;
- mono typography is active in the app shell, composer, dialogs and the settings row (computed `font-family` probe in
  every run; e.g. composer `IBM Plex Mono, …` in `10/11/12`).

The plugin does **not** write the theme id into the host durable `ui-theme.preference`; the host snapshot preference
only *reports* the active theme because the plugin calls `ctx.theme.setTheme(id)` (host design: non-built-in ids are
not persisted). Theme persistence is the plugin's own `localStorage` key — verified in item 3.

### Item 3 — Reload persistence, flash behaviour — **PASS**

- **Selected via the row, then reload** (run `09`): card click → theme active → `location.reload()` → theme restored,
  `data-dsh-futuristic-theme="nostromo-amber"`, tokens still inline (127), mono active;
- **Boot restore without any interaction** (runs `10/11/12`; Lead request (b)): `localStorage` preset + reload →
  theme applied, `--dsw-alias-bg-base` read from `body.style` = theme value (not only from the stylesheet), host
  snapshot `tokenCount=127`; screenshots [`09-boot-restore-nostromo.png`](screenshots/09-boot-restore-nostromo.png),
  [`10-boot-restore-omni.png`](screenshots/10-boot-restore-omni.png),
  [`11-boot-restore-steel.png`](screenshots/11-boot-restore-steel.png);
- **No visible built-in-palette flash** — timing sweep after `location.reload()` with a saved theme:

| time after reload triggered | observed state |
| --- | --- |
| 0.60–0.75 s | boot splash ("HARNESS — Loading plugins…"); app shell not mounted; plugin bundle not yet evaluated; body still carries the host default palette behind the splash |
| 0.90–1.10 s | plugin evaluated and **theme applied** (body attribute + 127 inline tokens); app shell still not mounted |
| 1.20 s+ | app shell mounted already themed |

So the built-in palette is never visible in the app chrome: the theme registers during the plugin-loading phase,
before the shell first paints. The splash is captured in
[`screenshots/16-boot-loading-splash.png`](screenshots/16-boot-loading-splash.png); restored states in the three
boot-restore screenshots above.

### Item 4 — Exit path to built-in appearance — **PASS** (D1 fixed and re-verified, §7.1)

**Interactive path (the normal one) — PASS.** Run `13`: select the Nostromo card, then click the built-in **Dark**
cube in Settings → Appearance 1.6 s later:

| assertion | observed |
| --- | --- |
| body attribute removed | `data-dsh-futuristic-theme` = `null`, `data-dsh-futuristic-effects` = `null` |
| palette returns to built-in | body background `rgb(21, 21, 23)`, no inline `--dsw-*` overrides, default system font stack |
| plugin state clears | `state.active = null`, `desired = null`, `reassertPending = false` |
| storage clears | `localStorage['…:active']` = `null` |
| host durable preference | `dark` |
| no bounce-back | theme not re-applied during a 1.5 s settle window; recent events `system → nostromo-amber → dark` |
| row reflects it | "Standard appearance" card active |

Screenshot: [`12-exit-path-built-in-dark.png`](screenshots/12-exit-path-built-in-dark.png).

**After reload — PASS (no resurrection).** Run `14`: theme → Dark → reload → no theme body attributes, built-in
dark palette, `localStorage` theme key still cleared, host preference `dark`.
Screenshot: [`13-exit-path-persisted-after-reload.png`](screenshots/13-exit-path-persisted-after-reload.png).

**Standard appearance button — PASS.** Run `20`: theme → "Standard appearance" card → plugin steps aside, host
preference `dark`, no body attributes, Standard card active
([`18-standard-appearance-restored.png`](screenshots/18-standard-appearance-restored.png)).

**`lastBuiltin` persistence fix (Lead change (b)) — PASS.** Run `21`: choose built-in **Light** → select Nostromo →
click "Standard appearance" → reload → the built-in choice is **Light** (body background `rgb(255, 255, 255)`,
`color-scheme: light`), `localStorage['…:last-builtin'] = "light"`, host preference `light`
([`19-lastbuiltin-light-after-reload.png`](screenshots/19-lastbuiltin-light-after-reload.png)). Previously the plugin
read this key but never wrote it; the fix is effective.

**Boot-restore grace window (D1) — FIXED and re-verified in §7.1.** Pre-fix, a built-in appearance chosen within
~5 s of a restored-theme reload was re-asserted back to the theme (historical repro runs `48/49/50`, control `51`).
After the Lead's capture-phase click fix the same repro now ends with `graceUntil=0`, no body attributes, built-in
palette and cleared selection, while the boot-restore path itself still restores the theme (regression run
`d1-boot-restore`).

### Item 5 — "Decorative effects" switch — **PASS**

Boot-time and runtime paths both verified; the overlay pseudo-elements paint only while
`body[data-dsh-futuristic-effects="on"]`, and the theme palette is unchanged when they are off.

| state | body effects attr | overlay `::before` computed `background-image` | body background |
| --- | --- | --- | --- |
| effects on (boot, run `15`) | `on` | `repeating-linear-gradient(rgba(0, 0, 0, 0.4) 0px, …, rgba(0, 0, 0, 0) 3px)`, `opacity: 0.23` | `rgb(11, 8, 4)` |
| effects off (boot, run `16`) | `off` | `none`, `opacity: 1` | `rgb(11, 8, 4)` — unchanged |
| toggle off at runtime (run `17`) | `off` | `none` | `rgb(10, 13, 18)` — unchanged |
| toggle back on (run `18`) | `on` | `linear-gradient(rgba(63, 208, 255, 0.05) …)` again | `rgb(10, 13, 18)` |

Screenshots: [`14-effects-on.png`](screenshots/14-effects-on.png) / [`15-effects-off.png`](screenshots/15-effects-off.png).
Pixel comparison (`tools/image_diff`, threshold 10): **43.8 % of pixels differ**, concentrated along the whole viewport
— i.e. the difference is the decorative layer, while every base token/colour probe is identical between the two runs
(see table). Diff heat-map: [`28-effects-on-vs-off-diff.png`](screenshots/28-effects-on-vs-off-diff.png). Overlay is
`pointer-events: none` and `elementFromPoint` never returns it (run `44`).

### Item 6 — Settings-row usability — **PASS** (D2 fixed and re-verified, §7.2)

| check | result |
| --- | --- |
| 4 cards | ✓ exactly 4 `.dshft-card` elements: Nostromo Amber, Omni-tool, Renaissance Steel, Standard appearance |
| active state follows selection | ✓ `data-active="true"` / `aria-pressed="true"` on the clicked theme; Standard card active when no theme; switching theme moves both |
| labels/taglines/description read correctly | ✓ EN copy renders (label in caps row, concept tagline below, description as card title/tooltip); card `title` = localized description |
| clicking "Standard appearance" restores built-in | ✓ (see item 4) |
| keyboard focus visible | **FIXED (rule present; §7.2)** — explicit `.dshft-card:focus-visible, .dshft-toggle input:focus-visible` rule now rides the host focus tokens; declaration resolves to `2px solid rgb(255,176,0)` (theme accent) with `outline-offset: 2px` on the actual card. Native buttons remain focusable with `aria-pressed`. WKWebView reports `:focus-visible=false` for programmatic focus (harness cannot inject trusted Tab), so the ring is verified via rule/CSSOM + declaration-resolution probes and documented as a harness limitation. |

Screenshot of the row with the dialog and host Appearance row:
[`02-settings-general-4-cards.png`](screenshots/02-settings-general-4-cards.png);
focus probe screenshot [`17-settings-row-focus-probe.png`](screenshots/17-settings-row-focus-probe.png).

### Item 7 — Regression sanity (dialogs, menus, tooltips, composer) — **PASS***

Exercised under themed builds (mostly Renaissance Steel, plus spot checks per theme):

| surface | runs / screenshots | result |
| --- | --- | --- |
| account menu (Settings / Feedback / Sign in) | `22/37/39`, steel/omni/nostromo screenshots `20`, `23` | readable, themed surface + hover states, no invisible text |
| model selector popover ("No models available.") | `23/40`, steel/nostromo screenshots `21`, `25` | popover readable on themed menu surface |
| Settings → Built-in plugins page (search, cards, disabled badges) | `24/38`, steel/omni screenshots `22`, `24` | all rows readable, secondary descriptions legible, themed accents |
| composer (contenteditable) | every themed boot run (`10/11/12/44`) | themed surface/text, mono font, caret/accent colour from theme; placeholder text visible |
| Settings dialog itself | `34/35/36` | themed dialog, card surfaces, mono typography, swatch strips |
| tooltips | not triggerable in an empty session (the only `role="tooltip"` implementation in the host is the conversation turn-navigator preview; no turns exist in this test environment). Synthetic pointer/focus events did not open any tooltip. | **N/A** — see limitations |
| automated invisible-text scan | all runs | in-page scan of every non-hidden text-bearing element (up to 2 000 per state) comparing computed colour vs nearest opaque background: **no pair below 2.2:1** in any state |

### Item 8 — Accessibility spot checks (computed styles) — **PASS**

Live computed contrast (not token arithmetic) in the running app, per theme:

| theme | theme text on app bg (body) | theme text on composer surface | sidebar text / sidebar bg |
| --- | --- | --- | --- |
| nostromo-amber | 14.79:1 | 13.08:1 | 14.79:1 |
| omni-tool | 15.39:1 | 12.78:1 | 15.39:1 |
| renaissance-steel | 12.57:1 | 11.16:1 | 12.04:1 |

All text pairs are far above 4.5:1. UI/accent pairs from the audit matrix (brand accent, warning, success, info on
bg; button label on accent fill) are all above their 3:1 minimums — full table in Appendix C. Lowest semantic pair
overall: `renaissance-steel` caption on app bg **4.66:1** (≥ 3:1 minimum).

---

## 4. Item summary

| # | item | result | caveat |
| --- | --- | --- | --- |
| 1 | Fresh page, built-in dark, no attrs, row present | **PASS** | — |
| 2 | 3 themes × (card click + localStorage/reload), inline tokens, mono | **PASS** | — (127/127 tokens identical) |
| 3 | Reload persistence / no visible palette flash | **PASS** | splash covers pre-theme paint (~0.9–1.2 s boot) |
| 4 | Exit path to built-in + persistence after reload | **PASS** | D1 fixed & re-verified (§7.1) |
| 5 | Effects off/on, theme colours intact | **PASS** | — |
| 6 | 4 cards, active state, Standard appearance, keyboard focus | **PASS** | D2 fixed & re-verified (§7.2; WKWebView programmatic-focus limitation) |
| 7 | Menus / dialogs / composer regressions, invisible-text scan | **PASS*** | tooltips N/A in empty session |
| 8 | Computed contrast text/bg + composer/bg per theme | **PASS** | lowest live pair 11.16:1 |

---

## 5. Defects, severity-ranked, with reproduction steps

### D1 — LOW / state machine: built-in appearance chosen inside the boot-restore grace window bounces back to the theme — **FIXED (re-verified in §7.1)**

**Status after Lead's fix (re-verified on the rebuilt bundle, 2026-10-30 ~20:25 local):** a capture-phase `click`
listener now cancels the boot grace and any pending deferred re-assert as soon as the user clicks inside a settings
dialog outside the plugin row; the repro now ends with `graceUntil=0` and a clean built-in state. The historical
behaviour below is kept as the reference repro.

**Observed:** after a reload with a restored theme, a built-in Dark/Light click made within ~5 s is overridden by the
plugin's deferred re-assert (`graceUntil = boot + 5000 ms`); the theme remains active, the host preference ends as the
theme id and `localStorage` keeps the theme. The *interactive* path (card selection → built-in click) is fixed and
works correctly; this is only the boot-restore path.

**Reproduction** (exact steps used; `steps/50-boot-grace-exit-instrumented.json`):

1. Open the token URL fresh.
2. Step: `localStorage.setItem('dsh-futuristic-themes:active','nostromo-amber'); location.reload();` — native wait 2.0 s.
3. Click `[aria-label="Account menu"]`, wait 1.0 s.
4. Click the Settings menu item, wait 2.0 s.
5. Click the built-in `Dark` cube in Settings → Appearance (button found: `darkFind=1`, `clickResult=clicked`), wait 1.5 s.

Actual: `body[data-dsh-futuristic-theme]="nostromo-amber"`, host preference `nostromo-amber`,
`localStorage.active="nostromo-amber"`, `recentEvents` ends with `dark → nostromo-amber` pairs, `reassertPending=false`
after settling. Screenshot evidence [`screenshots/26-boot-grace-exit-race.png`](screenshots/26-boot-grace-exit-race.png).

**Control:** identical flow but reload wait 6.5 s (click after `graceUntil`) — works: no body attributes, built-in dark,
preference `dark`, storage cleared (`steps/51-boot-exit-after-grace.json`,
[`screenshots/27-exit-after-grace.png`](screenshots/27-exit-after-grace.png)).

**Impact:** narrow window (~5 s after reload with a restored theme) where choosing a built-in appearance appears to be
ignored; the user has to click again after the window. No data loss, no persistence corruption (host durable preference
is written correctly by the host; the plugin's re-assert only affects the live selection/reporting).

**Suggested direction (not applied — plugin files are outside this verifier's write scope):** re-assert at most once
(guard the deferred re-assert with a "reasserted" flag), and skip it when a built-in preference event follows a
user-originated appearance change; alternatively clear the grace window on the first user interaction after boot. All
pre-existing interactive-path behaviour is correct.

### D2 — LOW / accessibility polish: no explicit `:focus-visible` styling for the plugin row controls — **FIXED (re-verified in §7.2)**

**Status after Lead's fix (re-verified on the rebuilt bundle, 2026-10-30 ~20:25 local):** `src/row.css` now defines
`.dshft-card:focus-visible, .dshft-toggle input:focus-visible` with the host focus tokens and `outline-offset: 2px`;
the rule is present in the mounted sheet and its declaration resolves to a visible 2px theme-accent ring on the actual
card. The historical behaviour below is kept as the reference repro.

`.dshft-card` and `.dshft-toggle input` are native focusable controls, but `src/row.css` has no `:focus-visible` rule,
while the host's own components consistently draw focus rings from `--dsw-focus-ring-width` /
`--dsw-focus-ring-color`. In the harness a programmatically focused card reports `outline-style: none`,
`box-shadow: none` and `:focus-visible = false` (screenshot
[`screenshots/17-settings-row-focus-probe.png`](screenshots/17-settings-row-focus-probe.png)) — no plugin-drawn focus
indicator exists. Whether WebKit's UA focus ring appears for a real keyboard user could not be verified because the
step driver cannot inject trusted key events.

**Impact:** if the UA ring is suppressed by keyboard-navigation settings, keyboard users may not see focus on the
theme cards/effects checkbox; at best the focus ring is visually inconsistent with the rest of the app. Low severity,
cheap fix.

**Suggested fix (not applied):** add to `src/row.css`

```css
.dshft-card:focus-visible,
.dshft-toggle input:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary));
  outline-offset: 2px;
}
```

### Non-defect notes (harness artifacts / limitations, recorded for transparency)

1. **Frozen CSS transitions off-screen.** WebKit throttles animations in the off-screen snapshot window
   (`document.getAnimations()` → `running`, `currentTime: 0`). Screenshots that switch a theme inside an already-open
   Settings dialog therefore show the plugin cards' pre-switch surface/border (host default dark `#2C2C2E`,
   border `rgba(255,255,255,0.2)`) for up to the 200 ms transition that never advances in the harness. This is not an
   app defect: themed-at-mount states (`34/35/36`: card bg = theme surface, computed ratio 11.66/12.78/11.16) and live
   token equality confirm the real rendering; ignore card surface colour in `03/05/07` if comparing.
2. **Console errors not captured.** The harness has no console bridge; boot health was asserted functionally (see §2.3).
3. **Tooltips N/A.** In an empty session there is no tooltip trigger installed by the host (the only `role="tooltip"`
   in the client tree is the conversation turn navigator preview); synthetic hover/focus could not open one. Menu
   surfaces used by actual popovers are themed and readable (item 7).
4. **LocalStorage is per-run.** The WKWebView store is non-persistent; persistence is validated via in-session reload,
   which matches the task's specified technique.
5. **Single viewport.** All runs at 1600×1000 CSS px; responsive behaviour at other sizes is out of scope for this task.
6. **English UI only.** The app locale under test is English; `zh` copy is verified statically by the audit (non-empty,
   schema-valid) but not rendered in the E2E run.

---

## 6. Final verdict

**PASS — the plugin is integrated correctly and is safe to ship on the final palettes.**

- All 8 task verification items pass; the static audit is 159/159 PASS with exit code 0.
- The three themes apply through both activation paths, their 127 derived tokens are byte-identical to the live body
  inline values, the palette reaches every probed surface (shell, sidebar, composer, dialogs, menus, settings page),
  monospace typography is active, persistence and the built-in exit path behave correctly (including the
  `lastBuiltin` persistence fix and the removed interactive grace window), and the decorative layer turns off
  completely without touching theme colours.
- Accessibility: live contrast is excellent (11.16–15.39:1 for body/composer text; the weakest semantic pair is
  4.66:1, above the 3:1 minimum for that grade).
- Both previously reported LOW defects (D1 boot-restore grace window, D2 missing explicit focus-visible style) were
  fixed by the Lead and independently re-verified (§7); no open defects remain. The re-verification was performed
  against a restarted port-51778 server serving the rebuilt bundle, without touching the plugin or shared tooling.

---

## 7. Post-fix re-verification of D1 and D2 (2026-10-30, ~20:25 Europe/Minsk)

**Trigger:** the Lead fixed D1 (capture-phase dialog-click hook cancels the boot grace and any pending re-assert) and
D2 (`:focus-visible` ring in `src/row.css`), rebuilt `lib/client.js` (51 243 B, 20:22), regenerated previews and
reported a green audit. This section is the independent re-check of exactly those two paths on a **restarted**
private server.

**Environment:** the old port-51778 listener was killed and `dsh web --no-open --port 51778` was restarted with
`DSH_HOME=<repo>/.dsh-qa` (job `bash-cb405c247a47472f`, 20:23; the token URL was
re-issued and is redacted here). Static gate re-run on the rebuilt tree: **159/159 PASS, 0 FAIL, 0 WARN, exit 0**
([`audit-report.json`](audit-report.json), `2026-10-30T17:22:52Z`).

### 7.1 D1 — boot-restore grace window: **FIXED**

Fix under test: (a) capture-phase `document` `click` hook calls `cancelBootGrace()` (`graceUntil = 0`, clears
`reassertTimer`) for any click inside a `[role="dialog"]` outside the plugin's `.dshft` row; (b) the 5 s grace now
exists only for asynchronous settings adoption at boot.

| run | steps (native waits) | result |
| --- | --- | --- |
| `d1-repro` (same shape as the original failing run-49) | reload with saved `nostromo-amber`, wait 1.8 s → account menu → Settings (1.4 s) → built-in **Dark**, settle 1.5 s | **PASS** — no `data-dsh-futuristic-theme`, body bg `rgb(21,21,23)` (built-in dark), `state.active=null`, `desired=null`, **`graceUntil=0`**, `reassertPending=false`, host preference `dark`, `localStorage.active=null`, Standard card active; no bounce. [`29-d1-fixed-exit-inside-grace.png`](screenshots/29-d1-fixed-exit-inside-grace.png) |
| `d1-repro-race` (instrumented click with grace remaining) | same, but reload wait 2.0 s → Settings 2.0 s → instrumented Dark click | **PASS** — click reached the button; same clean state; `graceUntil=0` after the click; recent events end at `dark`. [`30-d1-fixed-race-instrumented.png`](screenshots/30-d1-fixed-race-instrumented.png) |
| `d1-control-after-grace` (control) | reload, wait 6.5 s (past grace) → Settings → Dark | **PASS** — same clean state; the control path is unchanged. [`31-d1-control-after-grace.png`](screenshots/31-d1-control-after-grace.png) |
| `d1-boot-restore` (no-regression check) | reload with saved nostromo only, no clicks | **PASS** — theme restored: `data-dsh-futuristic-theme="nostromo-amber"`, bg `rgb(11,8,4)`, 127 inline tokens, mono typography, host preference theme id. [`32-d1-boot-restore-regression.png`](screenshots/32-d1-boot-restore-regression.png) |

The original bounce signature (`recentEvents` ending `… dark → nostromo-amber`) is gone; the fixed repro's event tail
is `… → dark` and `graceUntil` is cancelled to 0. **D1 is fixed; the sole residual caveat from §5 is closed.**

### 7.2 D2 — focus ring: **FIXED** (rule present + declaration resolves; programmatic-focus limitation documented)

Probes (`d2-focus-rule`, `d2-pointer-click`, `d2-resolution`) against the rebuilt/link-served plugin:

- **Rule present:** the mounted plugin stylesheet (`<style data-plugin="dsh-futuristic-themes">`) contains exactly
  `.dshft-card:focus-visible, .dshft-toggle input:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid
  var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary)); outline-offset: 2px; }`; CSSOM read-back matches with
  `outline-offset: 2px` ([`33-d2-focus-rule-mounted.png`](screenshots/33-d2-focus-rule-mounted.png)).
- **Host tokens inherited:** `--dsw-focus-ring-width` inherits as `2px` on `.dshft-card`. This host build leaves
  `--dsw-focus-ring-color` undefined, so the second fallback resolves to the theme's `--dsw-alias-brand-primary`
  (`#FFB000` under nostromo, `#f9fafb` under built-in dark).
- **Declaration resolves on the real card:** applying the identical declaration to the actual `.dshft-card` yields
  `outline: 2px solid rgb(255, 176, 0)`, `outline-offset: 2px` (`CSS.supports(...) = true`) — a visible keyboard
  focus ring in the active theme accent ([`34-d2-focus-ring-resolution.png`](screenshots/34-d2-focus-ring-resolution.png)).
- **Pointer modality stays clean:** after a pointer click on a theme card, the computed `outline-style` remains `none`
  (the visible inset shadow is the *active-card* style, not a focus ring)
  ([`35-d2-pointer-click-clean.png`](screenshots/35-d2-pointer-click-clean.png)).
- **Documented harness limitation:** WKWebView reports `:focus-visible = false` for programmatic `element.focus()` in
  the off-screen snapshot window (no trusted keyboard event; the same limitation as the original report), so the ring
  cannot be photographed here. `:focus-visible`-driven styling is exactly the host's own pattern, and the
  rule/declaration/token-resolution checks above prove the computed ring when it applies.

**D2 is fixed; the original caveat from §5 is closed** (with the WebKit programmatic-focus limitation retained in the
report).

### 7.3 Verdict after fixes

- D1: **FIXED — re-verified** (repro + instrumented repro + after-grace control + boot-restore regression all PASS).
- D2: **FIXED — re-verified** by mounted-sheet rule presence, host-token inheritance, declaration resolution on the
  actual card, and pointer-click cleanliness; the keyboard-visual confirmation remains limited by the WKWebView
  harness (documented, not a code issue).
- Static audit on the rebuilt bundle: **159/159 PASS, exit 0**.
- **Final verdict unchanged: PASS — no open defects.**

New artifacts for this addendum: screenshots `29`–`35`; step scripts `d1-repro.json`, `d1-repro-race.json`,
`d1-control-after-grace.json`, `d1-boot-restore.json`, `d2-focus-rule.json`, `d2-pointer-click.json`,
`d2-resolution.json`; extra diagnostic probes `diag-d2.js`, `diag-d2b.js` — all under [`steps/`](steps/) and
[`screenshots/`](screenshots/).

---

## Appendix A — static audit result (independent harness)

```text
SUMMARY: 159 checks — 159 PASS, 0 FAIL (hard), 0 WARN, 0 INFO, 0 SKIP
EXIT CODE: 0 (no hard failures)
report JSON: <repo>/docs/qa/audit-report.json
```

Breakdown: A package shape 18 · B theme completeness 61 · C contrast matrix 39 · D effects CSS discipline 25 ·
E built bundle truth 16. Highlights: all three themes derive 127 tokens; every `REQUIRED_TOKENS` present; all token
names in the `--dsw-alias-*` / `--dsw-specific-*` / `--dsw-menu-surface-fill` namespace; all values flat CSS strings
(no `[object Object]`); effects sheets gated to
`body[data-dsh-futuristic-theme="<own id>"][data-dsh-futuristic-effects="on"] #dsh-ft-overlay::before/::after`;
bundle in sync with sources.

## Appendix B — run matrix (50 snapshot runs of the original E2E; the post-fix D1/D2 re-verification runs are listed in §7)

Each run: fresh token URL → step script (or no-op) → diagnostic JS probe → single 1600×1000 screenshot.
`theme`/`effects` are body attributes; `bg` is the computed body background; `token bg` is
`body.style['--dsw-alias-bg-base']`; `host pref` is the host theme snapshot preference; `cards` is
`.dshft-card` count / active card.

| run | theme attr | effects | bg | token bg | host pref | cards / active | errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `01-fresh-boot` | — | — | rgb(21, 21, 23) | — | system | — / — | 0 |
| `02-settings-general` | — | — | rgb(21, 21, 23) | — | system | 4 / standard | 0 |
| `03-nostromo-settings` | nostromo-amber | on | rgb(11, 8, 4) | #0B0804 | nostromo-amber | 4 / nostromo | 0 |
| `04-nostromo-app` | nostromo-amber | on | rgb(11, 8, 4) | #0B0804 | nostromo-amber | — / — | 0 |
| `05-omni-settings` | omni-tool | on | rgb(10, 13, 18) | #0A0D12 | omni-tool | 4 / omni | 0 |
| `06-omni-app` | omni-tool | on | rgb(10, 13, 18) | #0A0D12 | omni-tool | — / — | 0 |
| `07-steel-settings` | renaissance-steel | on | rgb(7, 9, 12) | #07090C | renaissance-steel | 4 / steel | 0 |
| `08-steel-app` | renaissance-steel | on | rgb(7, 9, 12) | #07090C | renaissance-steel | — / — | 0 |
| `09-nostromo-card-reload` | nostromo-amber | on | rgb(11, 8, 4) | #0B0804 | nostromo-amber | — / — | 0 |
| `10-nostromo-boot-preset` | nostromo-amber | on | rgb(11, 8, 4) | #0B0804 | nostromo-amber | — / — | 0 |
| `11-omni-boot-preset` | omni-tool | on | rgb(10, 13, 18) | #0A0D12 | omni-tool | — / — | 0 |
| `12-steel-boot-preset` | renaissance-steel | on | rgb(7, 9, 12) | #07090C | renaissance-steel | — / — | 0 |
| `13-exit-path` | — | — | rgb(21, 21, 23) | — | dark | 4 / standard | 0 |
| `14-exit-persist-reload` | — | — | rgb(21, 21, 23) | — | dark | — / — | 0 |
| `15-effects-on-boot` | nostromo-amber | on | rgb(11, 8, 4) | #0B0804 | nostromo-amber | — / — | 0 |
| `16-effects-off-boot` | nostromo-amber | off | rgb(11, 8, 4) | #0B0804 | nostromo-amber | — / — | 0 |
| `17-effects-toggle-off` | omni-tool | off | rgb(10, 13, 18) | #0A0D12 | omni-tool | — / — | 0 |
| `18-effects-toggle-back` | omni-tool | on | rgb(10, 13, 18) | #0A0D12 | omni-tool | — / — | 0 |
| `19-focus` | — | — | rgb(21, 21, 23) | — | dark | 4 / standard | 0 |
| `20-standard-appearance` | — | — | rgb(21, 21, 23) | — | dark | 4 / standard | 0 |
| `21-lastbuiltin-light` | — | — | rgb(255, 255, 255) | — | light | — / — | 0 |
| `22-regression-account-menu` | renaissance-steel | on | rgb(7, 9, 12) | #07090C | renaissance-steel | — / — | 0 |
| `23-regression-model-selector` | renaissance-steel | on | rgb(7, 9, 12) | #07090C | renaissance-steel | — / — | 0 |
| `24-regression-builtin-plugins` | renaissance-steel | on | rgb(7, 9, 12) | #07090C | renaissance-steel | — / — | 0 |
| `26-flash-t06` | — | — | rgb(255, 255, 255) | — | — | — / — | 0 |
| `27-flash-t12` | nostromo-amber | on | rgb(11, 8, 4) | #0B0804 | nostromo-amber | — / — | 0 |
| `28-flash-t20` | nostromo-amber | on | rgb(11, 8, 4) | #0B0804 | nostromo-amber | — / — | 0 |
| `29-reset-dark` | — | — | rgb(21, 21, 23) | — | dark | — / — | 0 |
| `30-flash-d075` | — | — | rgb(255, 255, 255) | — | — | — / — | 0 |
| `31-flash-d09` | nostromo-amber | on | rgb(11, 8, 4) | #0B0804 | nostromo-amber | — / — | 0 |
| `32-flash-d102` | nostromo-amber | on | rgb(11, 8, 4) | #0B0804 | nostromo-amber | — / — | 0 |
| `33-flash-d11` | nostromo-amber | on | rgb(11, 8, 4) | #0B0804 | nostromo-amber | — / — | 0 |
| `34-nostromo-settings-boot` | nostromo-amber | on | rgb(11, 8, 4) | #0B0804 | nostromo-amber | 4 / nostromo | 0 |
| `35-omni-settings-boot` | omni-tool | on | rgb(10, 13, 18) | #0A0D12 | omni-tool | 4 / omni | 0 |
| `36-steel-settings-boot` | renaissance-steel | on | rgb(7, 9, 12) | #07090C | renaissance-steel | 4 / steel | 0 |
| `37-omni-account-menu` | omni-tool | on | rgb(10, 13, 18) | #0A0D12 | omni-tool | — / — | 0 |
| `38-omni-builtin-plugins` | omni-tool | on | rgb(10, 13, 18) | #0A0D12 | omni-tool | — / — | 0 |
| `39-nostromo-account-menu` | nostromo-amber | on | rgb(11, 8, 4) | #0B0804 | nostromo-amber | — / — | 0 |
| `40-nostromo-model-selector` | nostromo-amber | on | rgb(11, 8, 4) | #0B0804 | nostromo-amber | — / — | 0 |
| `41-tooltip-steel` | renaissance-steel | on | rgb(7, 9, 12) | #07090C | renaissance-steel | 4 / steel | 0 |
| `42-tooltip-steel2` | renaissance-steel | on | rgb(7, 9, 12) | #07090C | renaissance-steel | 4 / steel | 0 |
| `43-fresh-boot-final` | — | — | rgb(21, 21, 23) | — | dark | — / — | 0 |
| `44-pointer-through` | omni-tool | on | rgb(10, 13, 18) | #0A0D12 | omni-tool | — / — | 0 |
| `45-fulltokens-nostromo-amber` | — | — | — | #0B0804 | — | — / — | 0 |
| `46-fulltokens-omni-tool` | — | — | — | #0A0D12 | — | — / — | 0 |
| `47-fulltokens-renaissance-steel` | — | — | — | #07090C | — | — / — | 0 |
| `48-boot-grace-exit-race` | nostromo-amber | on | rgb(11, 8, 4) | #0B0804 | nostromo-amber | — / — | 0 |
| `49-boot-grace-exit-race2` | nostromo-amber | on | rgb(11, 8, 4) | #0B0804 | nostromo-amber | 4 / nostromo | 0 |
| `50-boot-grace-exit-instrumented` | nostromo-amber | — | — | — | nostromo-amber | — / — | 0 |
| `51-boot-exit-after-grace` | — | — | rgb(21, 21, 23) | — | dark | 4 / standard | 0 |

Notes: `45/46/47` used the full-token diagnostic (no body/effects fields, hence blanks); `48/49/50/51` are the D1
repro/control runs; `26–33` are the flash-timing sweep; `41/42` are tooltip attempts; `44` is the pointer-through test.

## Appendix C — contrast matrix for the final palettes (from the audit harness)

| pair (WCAG target) | nostromo-amber | omni-tool | renaissance-steel |
| --- | --- | --- | --- |
| `text-bg` | 14.79:1 (label-primary on bg-base) | 15.39:1 (label-primary on bg-base) | 12.57:1 (label-primary on bg-base) |
| `text-surface1` | 13.98:1 (label-primary on bg-layer-1) | 14.09:1 (label-primary on bg-layer-1) | 11.77:1 (label-primary on bg-layer-1) |
| `text-surface2` | 13.08:1 (label-primary on bg-layer-2) | 12.78:1 (label-primary on bg-layer-2) | 11.16:1 (label-primary on bg-layer-2) |
| `text-surface3` | 11.66:1 (label-primary on bg-layer-3) | 11.30:1 (label-primary on bg-layer-3) | 10.15:1 (label-primary on bg-layer-3) |
| `secondary-bg` | 9.67:1 (label-secondary on bg-base) | 10.04:1 (label-secondary on bg-base) | 6.82:1 (label-secondary on bg-base) |
| `tertiary-bg` | 5.93:1 (label-tertiary on bg-base) | 7.67:1 (label-tertiary on bg-base) | 5.00:1 (label-tertiary on bg-base) |
| `caption-bg` | 5.04:1 (label-caption on bg-base) | 4.76:1 (label-caption on bg-base) | 4.66:1 (label-caption on bg-base) |
| `primary-bg` | 10.91:1 (brand-primary on bg-base) | 9.17:1 (brand-primary on bg-base) | 8.69:1 (brand-primary on bg-base) |
| `warning-bg` | 5.95:1 (state-warn-primary on bg-base) | 5.84:1 (state-warn-primary on bg-base) | 5.32:1 (state-warn-primary on bg-base) |
| `success-bg` | 8.97:1 (state-success-primary on bg-base) | 11.18:1 (state-success-primary on bg-base) | 10.85:1 (state-success-primary on bg-base) |
| `info-bg` | 12.06:1 (label-deep-diving on bg-base) | 10.82:1 (label-deep-diving on bg-base) | 7.70:1 (label-deep-diving on bg-base) |
| `button-label` | 11.11:1 (label-primary-foreground on brand-primary) | 9.44:1 (label-primary-foreground on brand-primary) | 8.80:1 (label-primary-foreground on brand-primary) |

All thresholds: text on surfaces 4.5:1, secondary/tertiary/caption/accent/state/button-label 3:1 — **every pair passes**.

## Appendix D — artifacts

### Screenshots (35 files)

- [`screenshots/01-fresh-boot-built-in-dark.png`](screenshots/01-fresh-boot-built-in-dark.png)
- [`screenshots/02-settings-general-4-cards.png`](screenshots/02-settings-general-4-cards.png)
- [`screenshots/03-nostromo-settings.png`](screenshots/03-nostromo-settings.png)
- [`screenshots/04-nostromo-app.png`](screenshots/04-nostromo-app.png)
- [`screenshots/05-omni-settings.png`](screenshots/05-omni-settings.png)
- [`screenshots/06-omni-app.png`](screenshots/06-omni-app.png)
- [`screenshots/07-steel-settings.png`](screenshots/07-steel-settings.png)
- [`screenshots/08-steel-app.png`](screenshots/08-steel-app.png)
- [`screenshots/09-boot-restore-nostromo.png`](screenshots/09-boot-restore-nostromo.png)
- [`screenshots/10-boot-restore-omni.png`](screenshots/10-boot-restore-omni.png)
- [`screenshots/11-boot-restore-steel.png`](screenshots/11-boot-restore-steel.png)
- [`screenshots/12-exit-path-built-in-dark.png`](screenshots/12-exit-path-built-in-dark.png)
- [`screenshots/13-exit-path-persisted-after-reload.png`](screenshots/13-exit-path-persisted-after-reload.png)
- [`screenshots/14-effects-on.png`](screenshots/14-effects-on.png)
- [`screenshots/15-effects-off.png`](screenshots/15-effects-off.png)
- [`screenshots/16-boot-loading-splash.png`](screenshots/16-boot-loading-splash.png)
- [`screenshots/17-settings-row-focus-probe.png`](screenshots/17-settings-row-focus-probe.png)
- [`screenshots/18-standard-appearance-restored.png`](screenshots/18-standard-appearance-restored.png)
- [`screenshots/19-lastbuiltin-light-after-reload.png`](screenshots/19-lastbuiltin-light-after-reload.png)
- [`screenshots/20-regression-account-menu-steel.png`](screenshots/20-regression-account-menu-steel.png)
- [`screenshots/21-regression-model-selector-steel.png`](screenshots/21-regression-model-selector-steel.png)
- [`screenshots/22-regression-builtin-plugins-steel.png`](screenshots/22-regression-builtin-plugins-steel.png)
- [`screenshots/23-regression-account-menu-omni.png`](screenshots/23-regression-account-menu-omni.png)
- [`screenshots/24-regression-builtin-plugins-omni.png`](screenshots/24-regression-builtin-plugins-omni.png)
- [`screenshots/25-regression-model-selector-nostromo.png`](screenshots/25-regression-model-selector-nostromo.png)
- [`screenshots/26-boot-grace-exit-race.png`](screenshots/26-boot-grace-exit-race.png)
- [`screenshots/27-exit-after-grace.png`](screenshots/27-exit-after-grace.png)
- [`screenshots/28-effects-on-vs-off-diff.png`](screenshots/28-effects-on-vs-off-diff.png)
- [`screenshots/29-d1-fixed-exit-inside-grace.png`](screenshots/29-d1-fixed-exit-inside-grace.png)
- [`screenshots/30-d1-fixed-race-instrumented.png`](screenshots/30-d1-fixed-race-instrumented.png)
- [`screenshots/31-d1-control-after-grace.png`](screenshots/31-d1-control-after-grace.png)
- [`screenshots/32-d1-boot-restore-regression.png`](screenshots/32-d1-boot-restore-regression.png)
- [`screenshots/33-d2-focus-rule-mounted.png`](screenshots/33-d2-focus-rule-mounted.png)
- [`screenshots/34-d2-focus-ring-resolution.png`](screenshots/34-d2-focus-ring-resolution.png)
- [`screenshots/35-d2-pointer-click-clean.png`](screenshots/35-d2-pointer-click-clean.png)

### Step scripts / diagnostics (65 files in [`steps/`](steps/))

`*.json` — webshot native step scripts for every run (same names as the run matrix);
`diag.js` — the main in-page diagnostic (body attributes, inline tokens, host snapshot, plugin debug state,
overlay computed pseudo-element styles, live contrast probes, invisible-text scan, focus/hit-test probes);
`diag-fulltokens.js` — full 127-token dump used for the token-equality cross-check;
`diag-race.js` — instrumented D1 probe (records whether the built-in button was found/clicked).

### Exact commands

```sh
# static gate (independent audit)
NODE=$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node
"$NODE" <repo>/tools/audit-themes.mjs

# private environment (once)
cd <repo>
DSH_HOME=$PWD/.dsh-qa "/Applications/AI/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile web add "link:<repo>/dsh-futuristic-themes"
DSH_HOME=$PWD/.dsh-qa "/Applications/AI/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  web --no-open --port 51778        # prints the tokenized URL

# one verification run (example: themed-at-mount settings, nostromo)
cd <repo>/tools
./webshot "http://127.0.0.1:51778/?token=<token>" /tmp/out.png 1600 1000 4 \
  "@<repo>/docs/qa/steps/34-nostromo-settings-boot.json" 0.6 \
  "$(cat <repo>/docs/qa/steps/diag.js)"
```

The token is printed by the server's startup line; it is deliberately redacted in this report.

## Appendix E — raw live-vs-derived token equality output

```text
=== nostromo-amber: live=127 expected=127 mismatches=0 missing=0 extra=0
  IDENTICAL: all 127 derived tokens match body inline values; host: {"preference":"nostromo-amber","activeId":"nostromo-amber","tokenCount":127,"themeCount":5}
=== omni-tool: live=127 expected=127 mismatches=0 missing=0 extra=0
  IDENTICAL: all 127 derived tokens match body inline values; host: {"preference":"omni-tool","activeId":"omni-tool","tokenCount":127,"themeCount":5}
=== renaissance-steel: live=127 expected=127 mismatches=0 missing=0 extra=0
  IDENTICAL: all 127 derived tokens match body inline values; host: {"preference":"renaissance-steel","activeId":"renaissance-steel","tokenCount":127,"themeCount":5}
```
