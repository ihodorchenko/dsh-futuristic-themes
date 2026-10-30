# Audit baseline — dsh-futuristic-themes

**Task:** `task-4` · independent theme audit harness
**Owner:** `theme-verifier` (verification is deliberately separate from the designers and from
the plugin build).
**Read first:** [`docs/THEME-CONTRACT.md`](../THEME-CONTRACT.md).

## 1. What this is

`tools/audit-themes.mjs` is a read-only, independent audit harness for the
`dsh-futuristic-themes` plugin. It does **not** reimplement the plugin's token derivation: it
imports the plugin's own authoring library (`scripts/lib/derive.mjs`) and the build validator
(`prepareTheme()`), then additionally checks the package shape, the effects-CSS discipline, the
printed contrast matrix and the **built bundle's truthfulness** against the current sources.

It is written to be safe to run while theme designers are still editing:

- it never writes into the plugin (the only write is its own JSON report under `docs/qa/`);
- `scripts/build.mjs --check` is validation-only and writes nothing;
- every file read/parse is defensive: a file caught mid-write fails only its own check, the rest
  of the audit continues, and the exit code still reports the hard failures.

This harness covers static/contract verification only. Browser behaviour (theme switching,
persistence, effects toggle, settings row, regressions, live contrast) is covered by the
end-to-end verification in `docs/qa/verification-report.md`.

## 2. How to run

The bundled Node is not on `PATH`; always call it with the absolute path:

```sh
NODE=$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node
"$NODE" <repo>/tools/audit-themes.mjs
```

Options:

| flag | effect |
| --- | --- |
| `--plugin <dir>` | audit a different plugin checkout (default `<workspace>/dsh-futuristic-themes`) |
| `--json <path>` | report-JSON destination (default `<workspace>/docs/qa/audit-report.json`) |
| `--no-json` | do not write the report JSON |
| `--strict` | treat `WARN` findings as exit-code failures too |
| `--quiet` | print only `FAIL` / `WARN` lines plus the summary |
| `--help` | usage |

Artifacts per run:

- human PASS/FAIL report on stdout;
- `docs/qa/audit-report.json` — machine-readable checks, counts, hard failures and warnings.

## 3. Status semantics and exit code

| status | meaning | affects exit code |
| --- | --- | --- |
| `PASS` | check satisfied | no |
| `FAIL` | **hard** contract/mechanics violation | yes (exit 1) |
| `WARN` | quality finding the contract tolerates (e.g. contrast below a target ratio, stale preview data, `!important` in the effects layer) | only with `--strict` |
| `INFO` | informational context | no |
| `SKIP` | not computable (e.g. derivation could not be imported) | no |

Exit codes: `0` no hard failure, `1` hard failure(s), `2` usage error.

Contrast findings are `WARN` by design: the contract says the plugin build prints contrast
warnings but does not fail on them, so a draft palette must not mask real mechanical defects.

## 4. What each section checks

| section | checks |
| --- | --- |
| **A. Package shape** | `package.json` parses and is named; `dsh.bundle.patch` resolves to an existing `cordis.patch.yml`; that patch declares an `insert:` entry named after the package; `dsh.client.platform === "web"`; `exports["./client"]` and the main entry resolve to real files; `files` whitelist ships `lib/client.js` (and every listed file exists); `dsh.client.inject` pulls in the locale + `ui-theme` client packages; `skin.json` has a string `id`, a resolvable `entry` and the complete theme list; `lib/client.js` exists and passes `node --check`; `lib/index.js` exports an `apply()` function (**all hard failures**) |
| **B. Theme completeness** | contract themes present, no unexpected files, unique ids; per theme: id format / file-name match / reserved words, `colorScheme: "dark"`, en+zh `label`+`tagline`+`description`, 4–6 hex swatches, hex accent, schema-valid `preview`, raw `sidebarFill`/`menuFill` types, overrides namespace + flat strings, case roles documented/hex, unknown top-level keys; derivation through `deriveTokens()`; `prepareTheme()` parity; all `REQUIRED_TOKENS`; token namespace (`--dsw-alias-*`, `--dsw-specific-*`, `--dsw-menu-surface-fill`); flat string token values (no `[object Object]`/`undefined`) |
| **C. Contrast matrix** | WCAG ratios from the derived tokens for: text on bg / surface1 / surface2 / surface3 (≥ 4.5:1), secondary / tertiary / caption on bg (≥ 3:1), accent / warning / success / info on bg (≥ 3:1), button label on accent fill (≥ 3:1) — exact ratios printed, below-minimum listed |
| **D. Effects CSS discipline** | every rule in the three `src/effects/<id>.css` sheets must be a selector of the exact form `body[data-dsh-futuristic-theme="<own id>"][data-dsh-futuristic-effects="on"] #dsh-ft-overlay::before/::after`; no non-overlay targets, no cross-theme selectors, no `position: fixed` outside the bare overlay rule, no `pointer-events: auto`, no `!important` / `filter` / external URLs; animations must be covered by a `prefers-reduced-motion` guard (a sheet-local guard or the plugin's global guard in `src/base.css`); every theme owns an effects sheet with at least one rule |
| **E. Built bundle truth** | `scripts/build.mjs --check` exits 0; `lib/client.js` is ModuleLoader-loaded under the package id, inlines all three theme ids, contains no `[object Object]` and no unreplaced placeholders; the inlined `THEMES` payload is extracted and compared field-by-field and token-by-token with a fresh derivation from the current sources; inlined `EFFECTS_CSS` and `ROW_CSS` are compared byte-for-byte with the current sources (stale bundle ⇒ FAIL); `build/themes.json` freshness (WARN) and an mtime staleness hint (INFO) |

Sections A–D are static; section E is what catches "the plugin file people test is not what the
sources say" — the most common integration failure in a fast-moving design phase.

## 5. Baseline run — 2026-10-30T15:37:53.546Z

Captured **while designers `theme-nostromo`, `theme-omni`, `theme-steel` were still editing**
(`task-1`/`task-2`/`task-3` in progress); the built bundle had been generated before their latest
edits. Red results in section E are therefore **expected at this point** and are not design
defects — they disappear as soon as the Lead rebuilds `lib/client.js` after the palettes are
final.

```sh
NODE=$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node
"$NODE" <repo>/tools/audit-themes.mjs
# exit code: 1
```

**Result: 159 checks — 155 PASS · 2 FAIL (hard) · 1 WARN · 1 INFO · 0 SKIP.**

| result | check | why | expected now? |
| --- | --- | --- | --- |
| FAIL | `E10` inlined `THEMES` matches current sources | `lib/client.js` is stale: `theme "nostromo-amber" field "description"` differs from the current `src/themes/nostromo-amber.json` | **yes** — rebuild after designers finish |
| FAIL | `E12` inlined `EFFECTS_CSS` matches `src/effects` | bundle effects CSS is 2946 chars, sources are 5321 chars (effects sheets were rewritten after the last build) | **yes** — rebuild after designers finish |
| WARN | `E15` `build/themes.json` is fresh | generated preview data predates the latest palette edits | yes — regenerate with `node scripts/build.mjs` |
| INFO | `E16` mtime staleness hint | `nostromo-amber.css` is newer than `lib/client.js` | yes |

Everything else passes at this snapshot: package shape, all three theme derivations (127 tokens
each, all `REQUIRED_TOKENS`, flat string values, namespace clean), the full 12-pair contrast
matrix for all three palettes (lowest ratio currently 3.45:1 for `renaissance-steel` caption,
above its 3:1 minimum; primary text pairs ≥ 11.6:1), and effects-CSS discipline (all six rules
gated to the overlay with the correct theme id, no animation, no filters).

### Snapshot hashes (sha256, first 16 chars)

Inputs are pinned by these hashes; designers were still editing at capture time, so later runs will legitimately differ.

| input | hash |
| --- | --- |
| `cordis.patch.yml` | `f743d78ae8b05ff5…` |
| `lib/client.js` | `462b3a55231e5541…` |
| `lib/index.js` | `61af3483cd82d639…` |
| `package.json` | `4c2204ab6f702565…` |
| `scripts/build.mjs` | `030f9022f8e56171…` |
| `scripts/lib/derive.mjs` | `3a6959924a607c3e…` |
| `scripts/preview.mjs` | `3f22136eda3b4430…` |
| `skin.json` | `a4d46c0826cb7045…` |
| `src/base.css` | `80e893c757bd57d4…` |
| `src/client.template.js` | `731a7b51e2cba125…` |
| `src/effects/base.css` | `618196140cc7f632…` |
| `src/effects/nostromo-amber.css` | `4fab400cd0992d88…` |
| `src/effects/omni-tool.css` | `a1f870b35eeb07b9…` |
| `src/effects/renaissance-steel.css` | `57f7c12536c2d342…` |
| `src/row.css` | `38a11a4bfb0de6ef…` |
| `src/themes/nostromo-amber.json` | `f9618e257cae90f0…` |
| `src/themes/omni-tool.json` | `580d94bb55079452…` |
| `src/themes/renaissance-steel.json` | `38dd78e41de2a032…` |

### Full audit output at this snapshot

```text
dsh-futuristic-themes — independent audit harness
version 1.0.0 · node v24.21.0 · 2026-10-30T15:37:53.546Z
plugin: <repo>/dsh-futuristic-themes

A. Package shape — 18 check(s)
  PASS A1                       plugin root directory exists — <repo>/dsh-futuristic-themes
  PASS A2                       package.json is readable JSON
  PASS A3                       package.json has a package name — dsh-futuristic-themes
  PASS A4                       dsh.bundle.patch is declared — ./cordis.patch.yml
  PASS A5                       dsh.bundle.patch file exists — <repo>/dsh-futuristic-themes/cordis.patch.yml
  PASS A6                       cordis.patch.yml inserts an entry named after the package — dsh-futuristic-themes
  PASS A7                       dsh.client declares platform web — web
  PASS A8                       package exports["./client"] resolves to a file — ./lib/client.js
  PASS A9                       package main entry resolves to a file — ./lib/index.js
  PASS A10                      package files whitelist includes lib/client.js — files: lib/index.js, lib/client.js, cordis.patch.yml, skin.json, README.md
  PASS A11                      every file listed in package.files exists — 5 files present
  PASS A12                      dsh.client.inject includes the locale + theme client packages — @deepseek-ai/dsh-client-locale, @deepseek-ai/dsh-client-ui-theme
  PASS A13                      skin.json is readable JSON
  PASS A14                      skin.json has a string id — dsh-futuristic-themes
  PASS A15                      skin.json entry resolves and lists every src/themes id — ./lib/client.js -> [nostromo-amber, omni-tool, renaissance-steel]
  PASS A16                      lib/client.js exists and is not empty — 44.3 KiB
  PASS A17                      lib/client.js passes `node --check`
  PASS A18                      lib/index.js exports an apply() function — typeof apply === function

B. Theme completeness — 62 check(s)
  PASS B1                       src/themes is readable and contains theme JSON files — 3 file(s): nostromo-amber, omni-tool, renaissance-steel
  PASS B2                       all three contract themes are present — nostromo-amber, omni-tool, renaissance-steel
  PASS B3                       no unexpected theme files
  PASS B4                       theme ids are unique across files — 3 parsed theme(s)
  PASS B5                       scripts/lib/derive.mjs loads
  PASS B:nostromo-amber:id      nostromo-amber: id is valid and matches the file name — nostromo-amber
  PASS B:nostromo-amber:id-reserved nostromo-amber: id is not reserved by the host — nostromo-amber
  PASS B:nostromo-amber:scheme  nostromo-amber: colorScheme is "dark" — dark
  PASS B:nostromo-amber:copy    nostromo-amber: en+zh label, tagline and description are non-empty — 6 strings
  PASS B:nostromo-amber:swatches nostromo-amber: 4–6 swatches — 5 swatch(es)
  PASS B:nostromo-amber:swatches-hex nostromo-amber: every swatch is a hex colour — #0B0804, #FFB000, #FFD98A, #FF4A1C, #7FBF3F
  PASS B:nostromo-amber:accent  nostromo-amber: accent is a hex colour — #FFB000
  PASS B:nostromo-amber:preview nostromo-amber: preview payload is schema-valid — warning / bars
  PASS B:nostromo-amber:preview-spec nostromo-amber: preview matches the theme design task — warning "High load detected" / bars
  PASS B:nostromo-amber:raw-roles nostromo-amber: raw sidebarFill/menuFill values are strings — 2 raw roles checked
  PASS B:nostromo-amber:overrides nostromo-amber: overrides (if any) are valid flat tokens — 8 override(s)
  PASS B:nostromo-amber:roles-known nostromo-amber: every role is documented — 17 roles
  PASS B:nostromo-amber:roles-hex nostromo-amber: colour roles are opaque #rrggbb — all colour roles #rrggbb
  PASS B:nostromo-amber:keys    nostromo-amber: no unknown top-level keys — 10 keys
  PASS B:nostromo-amber:derive  nostromo-amber: roles derive the complete token set — 127 tokens
  PASS B:nostromo-amber:prepare nostromo-amber: build validator reports no schema errors — 0 contrast warning(s)
  PASS B:nostromo-amber:tokens-required nostromo-amber: all REQUIRED_TOKENS are present — 13 required tokens
  PASS B:nostromo-amber:tokens-namespace nostromo-amber: every token is in the --dsw-alias-/--dsw-specific- namespace — 127 token names
  PASS B:nostromo-amber:tokens-values nostromo-amber: every token value is a flat CSS string — all values flattened strings
  PASS B:omni-tool:id           omni-tool: id is valid and matches the file name — omni-tool
  PASS B:omni-tool:id-reserved  omni-tool: id is not reserved by the host — omni-tool
  PASS B:omni-tool:scheme       omni-tool: colorScheme is "dark" — dark
  PASS B:omni-tool:copy         omni-tool: en+zh label, tagline and description are non-empty — 6 strings
  PASS B:omni-tool:swatches     omni-tool: 4–6 swatches — 5 swatch(es)
  PASS B:omni-tool:swatches-hex omni-tool: every swatch is a hex colour — #0A0D12, #FF9A1F, #FFC266, #3FD0FF, #F2E3C9
  PASS B:omni-tool:accent       omni-tool: accent is a hex colour — #FF9A1F
  PASS B:omni-tool:preview      omni-tool: preview payload is schema-valid — info / gauge
  PASS B:omni-tool:preview-spec omni-tool: preview matches the theme design task — info "Processing batch..." / gauge
  PASS B:omni-tool:raw-roles    omni-tool: raw sidebarFill/menuFill values are strings — 2 raw roles checked
  PASS B:omni-tool:overrides    omni-tool: overrides (if any) are valid flat tokens — 8 override(s)
  PASS B:omni-tool:roles-known  omni-tool: every role is documented — 17 roles
  PASS B:omni-tool:roles-hex    omni-tool: colour roles are opaque #rrggbb — all colour roles #rrggbb
  PASS B:omni-tool:keys         omni-tool: no unknown top-level keys — 10 keys
  PASS B:omni-tool:derive       omni-tool: roles derive the complete token set — 127 tokens
  PASS B:omni-tool:prepare      omni-tool: build validator reports no schema errors — 0 contrast warning(s)
  PASS B:omni-tool:tokens-required omni-tool: all REQUIRED_TOKENS are present — 13 required tokens
  PASS B:omni-tool:tokens-namespace omni-tool: every token is in the --dsw-alias-/--dsw-specific- namespace — 127 token names
  PASS B:omni-tool:tokens-values omni-tool: every token value is a flat CSS string — all values flattened strings
  PASS B:renaissance-steel:id   renaissance-steel: id is valid and matches the file name — renaissance-steel
  PASS B:renaissance-steel:id-reserved renaissance-steel: id is not reserved by the host — renaissance-steel
  PASS B:renaissance-steel:scheme renaissance-steel: colorScheme is "dark" — dark
  PASS B:renaissance-steel:copy renaissance-steel: en+zh label, tagline and description are non-empty — 6 strings
  PASS B:renaissance-steel:swatches renaissance-steel: 4–6 swatches — 5 swatch(es)
  PASS B:renaissance-steel:swatches-hex renaissance-steel: every swatch is a hex colour — #07090C, #5FB4E6, #BCD0E0, #8A99A6, #5FD3B0
  PASS B:renaissance-steel:accent renaissance-steel: accent is a hex colour — #5FB4E6
  PASS B:renaissance-steel:preview renaissance-steel: preview payload is schema-valid — success / bars
  PASS B:renaissance-steel:preview-spec renaissance-steel: preview matches the theme design task — success "All systems nominal" / bars
  PASS B:renaissance-steel:raw-roles renaissance-steel: raw sidebarFill/menuFill values are strings — 2 raw roles checked
  PASS B:renaissance-steel:overrides renaissance-steel: overrides (if any) are valid flat tokens — 4 override(s)
  PASS B:renaissance-steel:roles-known renaissance-steel: every role is documented — 17 roles
  PASS B:renaissance-steel:roles-hex renaissance-steel: colour roles are opaque #rrggbb — all colour roles #rrggbb
  PASS B:renaissance-steel:keys renaissance-steel: no unknown top-level keys — 10 keys
  PASS B:renaissance-steel:derive renaissance-steel: roles derive the complete token set — 127 tokens
  PASS B:renaissance-steel:prepare renaissance-steel: build validator reports no schema errors — 0 contrast warning(s)
  PASS B:renaissance-steel:tokens-required renaissance-steel: all REQUIRED_TOKENS are present — 13 required tokens
  PASS B:renaissance-steel:tokens-namespace renaissance-steel: every token is in the --dsw-alias-/--dsw-specific- namespace — 127 token names
  PASS B:renaissance-steel:tokens-values renaissance-steel: every token value is a flat CSS string — all values flattened strings

C. Contrast matrix — 39 check(s)
  PASS C:nostromo-amber:text-bg nostromo-amber: primary text on app background >= 4.5:1 — 14.79:1 (label-primary on bg-base)
  PASS C:nostromo-amber:text-surface1 nostromo-amber: primary text on raised surface >= 4.5:1 — 13.98:1 (label-primary on bg-layer-1)
  PASS C:nostromo-amber:text-surface2 nostromo-amber: primary text on nested surface >= 4.5:1 — 13.08:1 (label-primary on bg-layer-2)
  PASS C:nostromo-amber:text-surface3 nostromo-amber: primary text on menu surface >= 4.5:1 — 11.66:1 (label-primary on bg-layer-3)
  PASS C:nostromo-amber:secondary-bg nostromo-amber: secondary text on app background >= 3:1 — 9.67:1 (label-secondary on bg-base)
  PASS C:nostromo-amber:tertiary-bg nostromo-amber: tertiary text on app background >= 3:1 — 5.93:1 (label-tertiary on bg-base)
  PASS C:nostromo-amber:caption-bg nostromo-amber: caption text on app background >= 3:1 — 5.04:1 (label-caption on bg-base)
  PASS C:nostromo-amber:primary-bg nostromo-amber: brand accent on app background >= 3:1 — 10.91:1 (brand-primary on bg-base)
  PASS C:nostromo-amber:warning-bg nostromo-amber: warning colour on app background >= 3:1 — 5.95:1 (state-warn-primary on bg-base)
  PASS C:nostromo-amber:success-bg nostromo-amber: success colour on app background >= 3:1 — 8.97:1 (state-success-primary on bg-base)
  PASS C:nostromo-amber:info-bg nostromo-amber: info signal on app background >= 3:1 — 12.06:1 (label-deep-diving on bg-base)
  PASS C:nostromo-amber:button-label nostromo-amber: button label on accent fill >= 3:1 — 11.11:1 (label-primary-foreground on brand-primary)
  PASS C:nostromo-amber:summary nostromo-amber: no semantic contrast pair below its minimum — 12 pairs ok
  PASS C:omni-tool:text-bg      omni-tool: primary text on app background >= 4.5:1 — 15.39:1 (label-primary on bg-base)
  PASS C:omni-tool:text-surface1 omni-tool: primary text on raised surface >= 4.5:1 — 14.09:1 (label-primary on bg-layer-1)
  PASS C:omni-tool:text-surface2 omni-tool: primary text on nested surface >= 4.5:1 — 12.58:1 (label-primary on bg-layer-2)
  PASS C:omni-tool:text-surface3 omni-tool: primary text on menu surface >= 4.5:1 — 11.04:1 (label-primary on bg-layer-3)
  PASS C:omni-tool:secondary-bg omni-tool: secondary text on app background >= 3:1 — 10.04:1 (label-secondary on bg-base)
  PASS C:omni-tool:tertiary-bg  omni-tool: tertiary text on app background >= 3:1 — 7.40:1 (label-tertiary on bg-base)
  PASS C:omni-tool:caption-bg   omni-tool: caption text on app background >= 3:1 — 4.76:1 (label-caption on bg-base)
  PASS C:omni-tool:primary-bg   omni-tool: brand accent on app background >= 3:1 — 9.17:1 (brand-primary on bg-base)
  PASS C:omni-tool:warning-bg   omni-tool: warning colour on app background >= 3:1 — 5.84:1 (state-warn-primary on bg-base)
  PASS C:omni-tool:success-bg   omni-tool: success colour on app background >= 3:1 — 11.18:1 (state-success-primary on bg-base)
  PASS C:omni-tool:info-bg      omni-tool: info signal on app background >= 3:1 — 10.82:1 (label-deep-diving on bg-base)
  PASS C:omni-tool:button-label omni-tool: button label on accent fill >= 3:1 — 9.44:1 (label-primary-foreground on brand-primary)
  PASS C:omni-tool:summary      omni-tool: no semantic contrast pair below its minimum — 12 pairs ok
  PASS C:renaissance-steel:text-bg renaissance-steel: primary text on app background >= 4.5:1 — 12.57:1 (label-primary on bg-base)
  PASS C:renaissance-steel:text-surface1 renaissance-steel: primary text on raised surface >= 4.5:1 — 11.77:1 (label-primary on bg-layer-1)
  PASS C:renaissance-steel:text-surface2 renaissance-steel: primary text on nested surface >= 4.5:1 — 11.16:1 (label-primary on bg-layer-2)
  PASS C:renaissance-steel:text-surface3 renaissance-steel: primary text on menu surface >= 4.5:1 — 10.15:1 (label-primary on bg-layer-3)
  PASS C:renaissance-steel:secondary-bg renaissance-steel: secondary text on app background >= 3:1 — 6.82:1 (label-secondary on bg-base)
  PASS C:renaissance-steel:tertiary-bg renaissance-steel: tertiary text on app background >= 3:1 — 5.00:1 (label-tertiary on bg-base)
  PASS C:renaissance-steel:caption-bg renaissance-steel: caption text on app background >= 3:1 — 4.66:1 (label-caption on bg-base)
  PASS C:renaissance-steel:primary-bg renaissance-steel: brand accent on app background >= 3:1 — 8.69:1 (brand-primary on bg-base)
  PASS C:renaissance-steel:warning-bg renaissance-steel: warning colour on app background >= 3:1 — 5.32:1 (state-warn-primary on bg-base)
  PASS C:renaissance-steel:success-bg renaissance-steel: success colour on app background >= 3:1 — 10.85:1 (state-success-primary on bg-base)
  PASS C:renaissance-steel:info-bg renaissance-steel: info signal on app background >= 3:1 — 7.70:1 (label-deep-diving on bg-base)
  PASS C:renaissance-steel:button-label renaissance-steel: button label on accent fill >= 3:1 — 8.80:1 (label-primary-foreground on brand-primary)
  PASS C:renaissance-steel:summary renaissance-steel: no semantic contrast pair below its minimum — 12 pairs ok

D. Effects CSS discipline — 25 check(s)
  PASS D1                       src/effects is readable and contains stylesheets — base.css, nostromo-amber.css, omni-tool.css, renaissance-steel.css
  PASS D2                       effects stylesheets parse into rules — 4 sheet(s), 6 rule(s)
  PASS D:base:target            shared base effects sheet paints only #dsh-ft-overlay — 0 rule(s)
  PASS D:nostromo-amber:gated   nostromo-amber.css: selectors gated on theme + effects body attributes — 2 rule(s) gated
  PASS D:nostromo-amber:target  nostromo-amber.css: selectors paint only #dsh-ft-overlay / ::before / ::after — overlay-only
  PASS D:nostromo-amber:theme-id nostromo-amber.css: selectors use this sheet's own theme id — nostromo-amber
  PASS D:nostromo-amber:declarations nostromo-amber.css: no fixed positioning or pointer-events on painted layers — none
  PASS D:nostromo-amber:soft-declarations nostromo-amber.css: declaration hygiene — no !important / filter
  PASS D:nostromo-amber:rules   nostromo-amber.css: paints at least one decorative rule — 2 rule(s)
  PASS D:omni-tool:gated        omni-tool.css: selectors gated on theme + effects body attributes — 2 rule(s) gated
  PASS D:omni-tool:target       omni-tool.css: selectors paint only #dsh-ft-overlay / ::before / ::after — overlay-only
  PASS D:omni-tool:theme-id     omni-tool.css: selectors use this sheet's own theme id — omni-tool
  PASS D:omni-tool:declarations omni-tool.css: no fixed positioning or pointer-events on painted layers — none
  PASS D:omni-tool:soft-declarations omni-tool.css: declaration hygiene — no !important / filter
  PASS D:omni-tool:rules        omni-tool.css: paints at least one decorative rule — 2 rule(s)
  PASS D:renaissance-steel:gated renaissance-steel.css: selectors gated on theme + effects body attributes — 2 rule(s) gated
  PASS D:renaissance-steel:target renaissance-steel.css: selectors paint only #dsh-ft-overlay / ::before / ::after — overlay-only
  PASS D:renaissance-steel:theme-id renaissance-steel.css: selectors use this sheet's own theme id — renaissance-steel
  PASS D:renaissance-steel:declarations renaissance-steel.css: no fixed positioning or pointer-events on painted layers — none
  PASS D:renaissance-steel:soft-declarations renaissance-steel.css: declaration hygiene — no !important / filter
  PASS D:renaissance-steel:rules renaissance-steel.css: paints at least one decorative rule — 2 rule(s)
  PASS D3                       each contract theme owns src/effects/<id>.css — nostromo-amber, omni-tool, renaissance-steel
  PASS D4                       animations are guarded by prefers-reduced-motion — no animations in the effects layer
  PASS D6                       no CSS filters on painted layers
  PASS D7                       no external resources in the effects layer

E. Built bundle truth — 15 check(s) — 2 FAIL
  PASS E1                       scripts/build.mjs exists — <repo>/dsh-futuristic-themes/scripts/build.mjs
  PASS E2                       `scripts/build.mjs --check` exits 0 — themes (3): nostromo-amber, omni-tool, renaissance-steel
  PASS E4                       lib/client.js declares the ModuleLoader plugin with the package id — dsh-futuristic-themes
  PASS E5                       lib/client.js inlines all three theme ids — nostromo-amber, omni-tool, renaissance-steel
  PASS E6                       lib/client.js contains no [object Object] token values — clean
  PASS E7                       lib/client.js contains no unreplaced template placeholders — none
  PASS E8                       lib/client.js inlines an extractable THEMES payload — 3 theme(s)
  PASS E9                       inlined THEMES carries every contract theme — nostromo-amber, omni-tool, renaissance-steel
  FAIL E10                      inlined THEMES matches the current derived sources (fresh build) — theme "nostromo-amber" field "description" in lib/client.js differs from current sources — rebuild needed
  PASS E11                      lib/client.js inlines an extractable EFFECTS_CSS payload — 2946 chars
  FAIL E12                      inlined EFFECTS_CSS matches src/effects (fresh build) — bundle 2946 chars vs sources 5321 chars — rebuild needed
  PASS E13                      inlined ROW_CSS matches src/base.css + src/row.css (fresh build) — 4231 chars in sync
  PASS E14                      inlined ROW_CSS contains the row, mono tokens and overlay base — `.dshft-card`, `--dsh-font-family-*`, `#dsh-ft-overlay` present
  WARN E15                      build/themes.json is fresh (preview data) — rewrite with `node scripts/build.mjs` — stale: nostromo-amber, omni-tool, renaissance-steel
  INFO E16                      lib/client.js is at least as new as every source file — stale hint: nostromo-amber.json is newer than lib/client.js — run `node scripts/build.mjs`

SUMMARY: 159 checks — 155 PASS, 2 FAIL (hard), 1 WARN, 1 INFO, 0 SKIP

HARD FAILURES
  E10 inlined THEMES matches the current derived sources (fresh build) — theme "nostromo-amber" field "description" in lib/client.js differs from current sources — rebuild needed
  E12 inlined EFFECTS_CSS matches src/effects (fresh build) — bundle 2946 chars vs sources 5321 chars — rebuild needed

WARNINGS (not exit-code failures)
  E15 build/themes.json is fresh (preview data) — rewrite with `node scripts/build.mjs` — stale: nostromo-amber, omni-tool, renaissance-steel

EXIT CODE: 1 (hard failure)
report JSON: <repo>/docs/qa/audit-report.json
```

The full machine-readable version of this run is `docs/qa/audit-report.json`.

## 6. Real defects found in the plugin mechanics (independent of the palettes)

These are static findings against `src/client.template.js` / the built bundle; they are **not**
caused by the draft palettes and will not be fixed by a rebuild. Severity estimates assume the
plugin's contract (§3–§5 of `THEME-CONTRACT.md`).

### D1 — Exit path can bounce back: built-in appearance chosen inside the grace window is re-asserted (medium, needs runtime confirmation)

`src/client.template.js`:

- `scheduleReassert()` (line 154) re-applies the saved theme 30 ms later while
  `Date.now() < graceUntil` (line 158);
- every `theme/change` with a built-in preference inside that window triggers it (lines 182–186);
- `graceUntil` is set to `now + 4000` on every theme selection (`selectTheme`, line 194) and to
  `now + 5000` on boot when a saved theme is restored (line 414).

Reproduction (to be confirmed in the end-to-end pass):

1. Open Settings → General → Futuristic Themes and click a theme card.
2. Within 4 s, click the built-in **Dark** (or **Light**) cube in Settings → Appearance.
3. Expected: the built-in palette stays. Predicted actual: ~30 ms later the plugin calls
   `ctx.theme.setTheme(<theme id>)` again, the plugin palette returns while the host durable
   preference says `dark` — the exit path appears to "bounce back".
4. After the grace window the same click works normally.

The Lead's smoke test on port 51777 reported the exit path working; this harness cannot prove or
disprove it (it is timing-dependent), so it is listed for the independent end-to-end run.

### D2 — `lastBuiltin` preference is read but never written (low, dead code path)

`STORAGE.lastBuiltin` is read on boot (line 365) but `writeStorage(STORAGE.lastBuiltin, …)` is
never called; the in-memory `state.lastBuiltin` (line 61, updated on line 172) is the only real
source. In practice the host's durable `ui-theme.preference` is re-adopted at boot, so the visible
fallback usually stays correct; the storage read path is nevertheless dead and would make
"Standard appearance" fall back to `dark` if host settings adoption were delayed/unavailable.

### D3 — `theme/change` listener is not tied to the plugin lifecycle (low)

`ctx.on("theme/change", onThemeChange)` (line 409) is called directly; unlike the other
registrations it is not wrapped in `ctx.effect(...)`, so the disposer is dropped. On a plugin
unmount/re-mount (HMR, profile reload) the stale listener keeps running against an old context
while a second one is added, which can double-write body attributes and storage.

### D4 — unused `THEME_BY_ID` map (info, cosmetic)

`THEME_BY_ID` (template lines 56–57) is never read; it is inlined into the shipped
`lib/client.js` (~60 bytes of dead data). Harmless.

No defects were found in the package/patch/skin shape, the token derivation or the build
pipeline at this snapshot.

## 7. Interpreting future runs

- **During design work** (`task-1`…`task-3` in progress): expect section E hard failures
  (`E10`/`E12`) and stale-artifact warnings until `lib/client.js` is rebuilt; contrast `WARN`s may
  appear while a palette is being tuned.
- **Release gate (before/with `task-5`)**: after the Lead runs
  `node scripts/build.mjs`, a re-run must exit `0` with **0 FAIL**. Any remaining `WARN` must be
  either fixed or explicitly justified in the verification report (contrast pairs below target,
  stale preview data).
- The harness is intentionally re-runnable at any time; it is read-only against the plugin and
  does not touch any server or port.
