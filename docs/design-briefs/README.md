# Design briefs (original commissioning documents)

These are the **original design briefs** the three themes were built from, kept verbatim in
Russian as they were written by the project owner. They are design inputs, not user
documentation; the engineering documentation is in English elsewhere in this repository.

| Theme | Original brief | What the brief asks for (English digest) |
| --- | --- | --- |
| **Nostromo Amber** | [Nostromo-Amber.md](Nostromo-Amber.md) | Retro-CRT starship terminal: almost-black warm background, amber interface elements, monospace typography, restrained glow, sharp corners. Exact tokens (`bg #0B0804`, `surface #14100A`, `border #3A2A10`, `dim #8A5A00`, `primary #FFB000`, `bright #FFCC33`, `text #FFD98A`, `warning #FF4A1C`, `ok #7FBF3F`), CRT rules (scanlines only on terminal areas, optional near-invisible flicker that respects `prefers-reduced-motion`), component states, the Harness screen layout (header, sidebar with amber selection bar, workspace/terminal, CPU/MEM/TEMP metrics, status bar), accessibility and a "ready" criterion. |
| **Omni-tool** | [Omni-tool.md](Omni-tool.md) | Modern sci-fi holographic HUD: orange action accent over dark blue-tinted glass, cold cyan secondary signals, glass panels with blur. Exact tokens (`bg #0A0D12` at 85–90% opacity with solid fallback, `surface #121821`, border `#FF9A1F` at 30%, `primary #FF9A1F`, `bright #FFC266`, `text #F2E3C9`, secondary `#3FD0FF`, `warning #FF4A3D`), sharp corners/cut edges, local glow only, state rules (success must not reuse cyan automatically), Harness layout (header, glass sidebar, workspace, circular gauge metrics, cyan connection marker), performance/fallback rules and readiness criterion. |
| **Renaissance Steel** | [Renaissance-Steel.md](Renaissance-Steel.md) | Restrained industrial console in a cold grey-blue palette, inspired by a space-station terminal; less glow and fewer CRT effects than Nostromo Amber, prioritising clear hierarchy, stable readability and comfort for long sessions. Exact tokens (`bg #07090C`, `surface #0E1318`, `border #26323D`, `dim #4F6A80`, `primary #5FB4E6`, `bright #9AD7FF`, `text #BCD0E0`, `secondary #8A99A6`, `warning #E2553F`, `ok #5FD3B0`), flat surfaces, thin 1 px frames, optional amber accent, very weak glow/texture, component states, Harness layout, accessibility checks and readiness criterion. |

The rendered concept the three briefs were based on is
[concept-rendering.png](concept-rendering.png) (the original 1536×1024 image).
