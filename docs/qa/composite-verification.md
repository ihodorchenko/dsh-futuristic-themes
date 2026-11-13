# Composite mode — live verification (plugin v0.4.0)

**Scope:** the new **Composite** mode in the Appearance row. It is not a fifth palette:
the four registered themes stay the only token sets, and Composite maps the host
Light / Dark / System preference onto one of them per scheme. This check covers the
row UI, the scheme mapping, the built-in-slot and auto-disable rules, manual overrides,
persistence and the settings-document echo.

**Date:** 2026-11-13, Europe/Minsk · **Host:** DeepSeek Harness Desktop 0.2.2-rc.3 ·
**Harness:** WKWebView screenshot runner (`tools/webshot`, off-screen window, non-persistent
data store) with in-page diagnostics.

## Environment

| | |
| --- | --- |
| `DSH_HOME` | a private `.dsh-qa` inside the workspace |
| Profile | `web`; `dsh-futuristic-themes` link-installed from the working tree (v0.4.0) |
| Server | `dsh web --no-open --port 51778`; token URL printed at start (redacted) |
| Row | Settings → General → Futuristic themes |
| Related gate | independent audit `tools/audit-themes.mjs`: **197/197 PASS**, 0 FAIL, 0 WARN |

## 1. Row UI — PASS

Composite off: **six cards** (Nostromo Amber, Omni-tool, Pure Reflection, Renaissance Steel,
Composite, Standard appearance), no scheme selectors.

Composite on: the Composite card is `data-active="true"` / `aria-pressed="true"`; the four
theme cards and Standard are inactive. Two selects appear below the cards:

- **Light scheme:** `Built-in`, `Nostromo Amber · dark`, `Omni-tool · dark`,
  `Pure Reflection · light`, `Renaissance Steel · dark`;
- **Dark scheme:** the same options.

The hint reads *“Settings → Appearance selects the scheme; an empty slot uses the built-in
appearance.”* The card's swatch strip mixes the light and dark palettes.

Screenshot: [`screenshots/composite-row.png`](screenshots/composite-row.png).

## 2. Defaults and host scheme mapping — PASS

Enabling Composite while Pure Reflection was the manual theme produced
`light: "pure-reflection"`, `dark: "nostromo-amber"` (the active theme kept its own scheme;
the other slot got the friendly default).

| host Appearance | observed |
| --- | --- |
| **Light** | `data-dsh-futuristic-theme="pure-reflection"`, body `#EFF1F4`, 136 tokens, `lastBuiltin: "light"` |
| **Dark** | `data-dsh-futuristic-theme="nostromo-amber"`, body `#0B0804`, 127 tokens, `lastBuiltin: "dark"` |
| **System** (OS light) | Pure Reflection applied, `lastBuiltin: "system"`, `lastScheme: "light"` |

The host snapshot after a mapped theme reports the theme id (`preference: "pure-reflection"` /
`"nostromo-amber"`); the durable preference was not touched.

## 3. Slot changes — PASS

- Changing the **Light** slot to `Omni-tool` while the current scheme was light applied Omni-tool
  immediately (127 tokens) without leaving Composite; the saved mapping became
  `light: "omni-tool"` (cross-scheme mapping is allowed).
- Changing the **Light** slot to **Built-in** while the current scheme was light returned to the
  built-in light appearance (`data-dsh-futuristic-theme` removed, body white, host preference
  `light`), while Composite stayed enabled and the Dark slot kept `nostromo-amber`.
- Changing the **Dark** slot to **Built-in** as well emptied both slots: Composite turned itself
  off (`composite.enabled: false`), the selectors disappeared, Standard appearance became active
  and the built-in light appearance was applied. This is the agreed rule for two empty slots.

## 4. Manual overrides — PASS

- Clicking a normal theme card (Omni-tool) while Composite was on disabled Composite and applied
  Omni-tool manually; the saved mappings were kept for a later re-enable.
- Clicking **Standard appearance** disabled Composite and returned to the built-in appearance.

## 5. Persistence and settings echo — PASS

- Composite + Dark mapping + reload: after the reload the app came back as **Nostromo Amber**
  before the shell, with `localStorage['dsh-futuristic-themes:composite']` intact
  (`{"enabled":true,"light":"pure-reflection","dark":"nostromo-amber"}`) and
  `lastBuiltin: "dark"`.
- While Composite was active and Light was mapped to Pure Reflection, increasing the font size
  (14 → 15 px) updated the settings document; the theme stayed Pure Reflection, Composite stayed
  enabled, and the recent events showed the host's `light → pure-reflection` echo/re-assert
  cycle without an exit.

## 6. Audit — PASS

The independent audit is unchanged at **197/197 PASS, 0 warnings**; the new row code and the
Composite mode do not alter the token sets, the derivation or the effects discipline.

## 7. Limitations

- The host's built-in Light / Dark / System cubes do not stay highlighted while a mapped theme is
  active; the host reports the theme id as the active preference. The Composite card and the two
  selectors are the indicator.
- A short frame of the built-in scheme is visible while switching Light/Dark, before the mapped
  theme lands. When light is paired with a light theme and dark with a dark theme the frame is
  the same brightness and is not noticeable; pairing a light theme with Dark intentionally gives
  a bright flash.
- The off-screen WKWebView freezes CSS transitions. A screenshot taken immediately after a
  light→dark composite switch can show the row cards' pre-switch surface while the rest of the
  dialog is already dark; a transition-free mount (dialog opened after the switch) renders
  correctly. This is a harness artifact, not a theme or Composite defect.
- The private profile has no signed-in account; conversation content, logs and error banners were
  not part of this check.

## Verdict

**PASS.** Composite mode is selectable from the row, follows the host Light / Dark / System
choice, supports an empty slot as the built-in appearance, auto-disables when both slots are
empty, preserves the mappings across restarts and does not interfere with manual theme
selection or the settings-document echo.
