#!/usr/bin/env node
/**
 * Generate standalone visual previews of every theme.
 *
 *   build/theme-<id>.html   one pixel-styled mock of the Harness window
 *   build/preview.html      all themes side by side (iframes)
 *
 * The mock intentionally uses the *real* `--dsw-*` token names, so the same
 * derived values that colour the application also colour the preview. Run
 * this after `scripts/build.mjs` (or just `node scripts/preview.mjs` — it
 * derives straight from `src/themes`).
 *
 * Usage: node scripts/preview.mjs [--only <id>]
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareTheme } from "./lib/derive.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const onlyIndex = process.argv.indexOf("--only");
const ONLY = onlyIndex !== -1 ? process.argv[onlyIndex + 1] : null;
const MONO = '"IBM Plex Mono", "JetBrains Mono", "Roboto Mono", "SF Mono", Menlo, Consolas, monospace';
const SANS = '"Inter", "Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';

/** Interface font stack for a theme: Inter for the light theme, mono for the dark ones. */
function fontStackFor(theme) {
  return theme.raw.colorScheme === "light" ? SANS : MONO;
}

const effectsDir = join(ROOT, "src/effects");
const effectsCss = existsSync(effectsDir)
  ? readdirSync(effectsDir)
      .filter((name) => name.endsWith(".css") && name !== "base.css")
      .sort()
      .map((name) => readFileSync(join(effectsDir, name), "utf8"))
      .join("\n")
  : "";

function loadThemes() {
  const dir = join(ROOT, "src/themes");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const raw = JSON.parse(readFileSync(join(dir, name), "utf8"));
      const prepared = prepareTheme(raw);
      if (prepared.errors.length > 0) {
        console.error(`error: ${raw.id ?? name}: ${prepared.errors.join("; ")}`);
        process.exitCode = 1;
        return null;
      }
      return { raw, tokens: prepared.tokens };
    })
    .filter(Boolean);
}

function cssVars(tokens) {
  return Object.entries(tokens)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
}

function bar(percent, danger, neutralTone) {
  const tone = danger ? "--dsw-alias-state-warn-primary" : neutralTone ?? "--dsw-alias-brand-primary";
  return `<div class="meter"><span style="width:${percent}%;background:var(${tone})"></span></div>`;
}

function mockPage(theme) {
  const raw = theme.raw;
  const label = raw.label.en;
  const tagline = raw.tagline.en;
  const notification = raw.preview?.notification ?? { kind: "warning", text: "High load detected" };
  const metrics = raw.preview?.metrics ?? "bars";
  const noticeTone =
    notification.kind === "warning"
      ? "--dsw-alias-state-warn-primary"
      : notification.kind === "success"
        ? "--dsw-alias-state-success-primary"
        : "--dsw-alias-state-business-primary";
  const noticeGlyph = notification.kind === "warning" ? "▲" : notification.kind === "success" ? "✓" : "ℹ";

  /* The light city theme maps its district colours onto the metrics: business
     blue for CPU, technical yellow for memory, residential orange for the
     warning metric. The dark themes keep their single accent. */
  const districtMetrics = raw.colorScheme === "light";
  const cpuTone = districtMetrics ? "--dsw-alias-chart-messages" : undefined;
  const memTone = districtMetrics ? "--dsw-alias-chart-tools" : undefined;

  const metricBlock =
    metrics === "gauge"
      ? `<div class="gauge" style="background:conic-gradient(var(--dsw-alias-brand-primary) 0 78%, var(--dsw-alias-bg-layer-3) 78% 100%)"><div class="gaugeInner">78%</div></div>
         <div class="metricLabel">Memory Usage</div>
         <svg class="spark" viewBox="0 0 120 40" preserveAspectRatio="none"><polyline points="0,30 14,26 26,31 38,18 50,22 62,12 74,16 86,9 98,14 110,6 120,10" fill="none" stroke="var(--dsw-alias-label-deep-diving)" stroke-width="1.5"/></svg>`
      : `<div class="metric"><span class="metricName">CPU</span><div class="metricRow">${bar(23, false, cpuTone)}<b>23%</b></div></div>
         <div class="metric"><span class="metricName">MEM</span><div class="metricRow">${bar(67, false, memTone)}<b>67%</b></div></div>
         <div class="metric"><span class="metricName">TEMP</span><div class="metricRow">${bar(58, true)}<b>42°C</b></div></div>`;

  const cards = Object.keys(themeById)
    .map((id) => {
      const other = themeById[id];
      const selected = id === raw.id;
      const swatches = other.raw.swatches
        .map((colour) => `<span class="swatch" style="background:${colour}"></span>`)
        .join("");
      return `<div class="card ${selected ? "cardActive" : ""}" style="--card-accent:${other.raw.accent}">
        <span class="swatches">${swatches}</span>
        <span class="cardName">${other.raw.label.en}</span>
        <span class="cardTag">${other.raw.tagline.en}</span>
        <span class="cardState">${selected ? "ACTIVE" : ""}</span>
      </div>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${label} — DSH futuristic theme preview</title>
<style>
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
${cssVars(theme.tokens)}
  min-height: 100vh;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-family: ${fontStackFor(theme)};
  font-size: 13px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
.page { width: 1240px; margin: 0 auto; padding: 34px 40px 44px; }
.brand { display: flex; align-items: baseline; gap: 18px; margin-bottom: 26px; }
.brandMark { width: 34px; height: 34px; border: 1px solid var(--dsw-alias-border-l4); display: grid; place-items: center; color: var(--dsw-alias-brand-primary); font-size: 15px; }
.brand h1 { margin: 0; font-size: 21px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; }
.brand h1 span { color: var(--dsw-alias-label-tertiary); }
.brand .kicker { margin-left: auto; color: var(--dsw-alias-label-caption); font-size: 11px; letter-spacing: .16em; text-transform: uppercase; }

/* ------------------------------------------------------------- app window */
.win { border: 1px solid var(--dsw-alias-border-l3); background: var(--dsw-alias-bg-layer-1); position: relative; box-shadow: 0 24px 70px rgba(0,0,0,.55); }
.win::before, .win::after { content: ""; position: absolute; width: 16px; height: 16px; border: 1px solid var(--dsw-alias-brand-primary); opacity: .7; pointer-events: none; }
.win::before { left: -1px; top: -1px; border-right: 0; border-bottom: 0; }
.win::after { right: -1px; bottom: -1px; border-left: 0; border-top: 0; }
.winTitle { display: flex; align-items: center; gap: 16px; padding: 12px 16px; border-bottom: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); }
.winName { font-size: 16px; font-weight: 500; letter-spacing: .22em; text-transform: uppercase; color: var(--dsw-alias-brand-primary); }
.winTag { color: var(--dsw-alias-label-tertiary); font-size: 10px; letter-spacing: .18em; text-transform: uppercase; }
.winBtns { margin-left: auto; display: flex; gap: 14px; color: var(--dsw-alias-label-secondary); font-size: 13px; }
.winBtns i { font-style: normal; }

.winBody { display: grid; grid-template-columns: 200px minmax(0, 1fr) 168px; min-height: 366px; }

/* sidebar */
.side { background: var(--dsw-specific-sidebar-fill); border-right: 1px solid var(--dsw-alias-border-l2); padding: 12px 0; display: flex; flex-direction: column; gap: 2px; }
.navItem { display: flex; align-items: center; gap: 8px; padding: 8px 14px; color: var(--dsw-alias-label-secondary); font-size: 13px; position: relative; }
.navItem b { margin-left: auto; color: var(--dsw-alias-label-tertiary); font-weight: 400; }
.navItem.active { color: var(--dsw-alias-label-primary); background: var(--dsw-specific-sidebar-nav-item-active); }
.navItem.active::before { content: ""; position: absolute; left: 0; top: 6px; bottom: 6px; width: 2px; background: var(--dsw-alias-brand-primary); box-shadow: 0 0 10px var(--dsw-alias-brand-primary); }
.navItem.active b { color: var(--dsw-alias-brand-primary); }

/* main */
.main { padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.main h2 { margin: 0; font-size: 17px; font-weight: 400; letter-spacing: .04em; }
.terminal { border: 1px solid var(--dsw-alias-border-l3); background: var(--dsw-alias-bg-base); padding: 18px 18px 26px; flex: 1; box-shadow: inset 0 0 60px rgba(0,0,0,.35); }
.promptLine { color: var(--dsw-alias-label-primary); font-size: 14px; display: flex; align-items: center; gap: 10px; }
.promptLine .caret { color: var(--dsw-alias-brand-primary); text-shadow: 0 0 8px var(--dsw-alias-brand-primary); }
.cursor { display: inline-block; width: 8px; height: 15px; background: var(--dsw-alias-brand-primary); box-shadow: 0 0 8px var(--dsw-alias-brand-primary); animation: blink 1.1s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }
.statusRow { display: flex; align-items: center; gap: 10px; color: var(--dsw-alias-label-secondary); font-size: 12px; flex-wrap: wrap; }
.statusRow .sep { color: var(--dsw-alias-border-l4); }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dsw-alias-state-success-primary); box-shadow: 0 0 8px var(--dsw-alias-state-success-primary); display: inline-block; }

/* metrics */
.metrics { border-left: 1px solid var(--dsw-alias-border-l2); padding: 18px 14px; display: flex; flex-direction: column; gap: 18px; background: var(--dsw-alias-bg-layer-2); }
.metric { display: flex; flex-direction: column; gap: 6px; }
.metricName { color: var(--dsw-alias-label-tertiary); font-size: 10px; letter-spacing: .16em; }
.metricRow { display: flex; align-items: center; gap: 8px; }
.metricRow b { font-weight: 500; font-size: 12px; color: var(--dsw-alias-label-primary); min-width: 34px; text-align: right; }
.meter { flex: 1; height: 9px; background: var(--dsw-alias-bg-layer-3); border: 1px solid var(--dsw-alias-border-l2); display: block; }
.meter span { display: block; height: 100%; }
.gauge { width: 92px; height: 92px; border-radius: 50%; align-self: center; display: grid; place-items: center; border: 1px solid var(--dsw-alias-border-l3); }
.gaugeInner { width: 70px; height: 70px; border-radius: 50%; background: var(--dsw-alias-bg-layer-2); display: grid; place-items: center; color: var(--dsw-alias-label-primary); font-size: 17px; }
.metricLabel { text-align: center; color: var(--dsw-alias-label-tertiary); font-size: 11px; margin-top: -8px; }
.spark { width: 100%; height: 40px; }

/* notice */
.notice { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-top: 1px solid var(--dsw-alias-border-l2); color: var(${noticeTone}); font-size: 12px; background: var(--dsw-alias-bg-layer-2); }
.notice .glyph { text-shadow: 0 0 10px currentColor; }

/* Light-scheme preview: keep the daylight look — no phosphor glows, no heavy
   black elevation under the window. */
body[data-color-scheme="light"] .win { box-shadow: 0 18px 48px rgba(32, 36, 38, 0.1); }
body[data-color-scheme="light"] .terminal { box-shadow: none; }
body[data-color-scheme="light"] .navItem.active::before,
body[data-color-scheme="light"] .cursor { box-shadow: none; }
body[data-color-scheme="light"] .promptLine .caret,
body[data-color-scheme="light"] .notice .glyph { text-shadow: none; }
body[data-color-scheme="light"] .dot { box-shadow: none; }

/* ------------------------------------------------------------ settings row */
.settings { margin-top: 26px; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); padding: 16px 18px 14px; }
.settingsTitle { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--dsw-alias-label-tertiary); margin-bottom: 12px; }
.settingsTitle em { font-style: normal; color: var(--dsw-alias-label-caption); letter-spacing: .02em; text-transform: none; }
.cards { display: flex; gap: 8px; flex-wrap: wrap; }
.card { flex: 1 1 0; min-width: 160px; display: flex; flex-direction: column; gap: 5px; padding: 10px; border: .5px solid var(--dsw-alias-border-l4); background: var(--dsw-alias-bg-layer-2); }
.cardActive { border-color: var(--card-accent); box-shadow: inset 0 0 0 1px var(--card-accent); background: var(--dsw-alias-bg-layer-3); }
.swatches { display: flex; height: 16px; }
.card .swatch { flex: 1; }
.cardName { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
.cardTag { font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.cardState { min-height: 12px; font-size: 10px; letter-spacing: .14em; color: var(--card-accent); }
.settingsFoot { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; color: var(--dsw-alias-label-caption); font-size: 11px; }
.switch { display: inline-flex; align-items: center; gap: 8px; color: var(--dsw-alias-label-secondary); }
.track { width: 28px; height: 16px; border-radius: 999px; background: var(--dsw-alias-brand-primary); position: relative; }
.knob { position: absolute; right: 2px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--dsw-alias-bg-base); }

.caption { margin-top: 18px; color: var(--dsw-alias-label-caption); font-size: 11px; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.caption code { color: var(--dsw-alias-label-tertiary); }

#dsh-ft-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 2000; }
#dsh-ft-overlay::before, #dsh-ft-overlay::after { content: ""; position: absolute; inset: 0; pointer-events: none; }
${effectsCss}
@media (prefers-reduced-motion: reduce) { .cursor { animation: none; } }
</style>
</head>
<body data-dsh-futuristic-theme="${raw.id}" data-dsh-futuristic-effects="on" data-color-scheme="${raw.colorScheme}">
<div class="page">
  <div class="brand">
    <div class="brandMark">◈</div>
    <h1>DeepSeek Harness <span>/ Themes</span></h1>
    <div class="kicker">${raw.id} · ${raw.colorScheme} · ${theme.tokens ? Object.keys(theme.tokens).length : 0} tokens</div>
  </div>

  <div class="win">
    <div class="winTitle">
      <span class="winName">${label}</span>
      <span class="winTag">${tagline}</span>
      <span class="winBtns"><i>—</i><i>□</i><i>×</i></span>
    </div>
    <div class="winBody">
      <aside class="side">
        <div class="navItem active">Explorer <b>›</b></div>
        <div class="navItem">Search</div>
        <div class="navItem">Runs</div>
        <div class="navItem">Datasets</div>
        <div class="navItem">Settings</div>
        <div class="navItem">About</div>
      </aside>
      <main class="main">
        <h2>New Session</h2>
        <div class="terminal">
          <div class="promptLine"><span class="caret">›</span> Ready. Awaiting input…<span class="cursor"></span></div>
        </div>
        <div class="statusRow">
          <span class="dot"></span><span>System: Online</span>
          <span class="sep">|</span><span>Model: DeepSeek R1</span>
          <span class="sep">|</span><span>Uptime: 12:34:56</span>
        </div>
      </main>
      <aside class="metrics">${metricBlock}</aside>
    </div>
    <div class="notice"><span class="glyph">${noticeGlyph}</span><span>${notification.text}</span></div>
  </div>

  <div class="settings">
    <div class="settingsTitle">Settings → General · Futuristic themes <em>— the row this plugin adds</em></div>
    <div class="cards">
      ${cards}
      <div class="card" style="--card-accent:var(--dsw-alias-brand-primary)">
        <span class="swatches"><span class="swatch" style="background:#151517"></span><span class="swatch" style="background:#303136"></span><span class="swatch" style="background:#f9fafb"></span><span class="swatch" style="background:#4176e6"></span></span>
        <span class="cardName">Standard appearance</span>
        <span class="cardTag">Built-in light / dark</span>
        <span class="cardState"></span>
      </div>
    </div>
    <div class="settingsFoot">
      <span class="switch"><span class="track"><span class="knob"></span></span> Decorative effects</span>
      <span>Inter / IBM Plex Mono · light &amp; dark · reduced-motion safe</span>
    </div>
  </div>

  <div class="caption">
    <span>Concept preview — the real client applies the same <code>--dsw-*</code> tokens to the whole application.</span>
    <span>${raw.description.en}</span>
  </div>
</div>
<div id="dsh-ft-overlay"></div>
</body>
</html>
`;
}

function combinedPage(themeList) {
  const frames = themeList
    .map(
      (theme) =>
        `<section class="frameBlock"><a class="frameTitle" href="theme-${theme.raw.id}.html">${theme.raw.label.en} <span>${theme.raw.id}</span></a><iframe src="theme-${theme.raw.id}.html" title="${theme.raw.label.en}"></iframe></section>`,
    )
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>DSH futuristic themes — combined preview</title>
<style>
  html, body { margin: 0; background: #000; color: #aaa; font: 12px ${MONO}; }
  body { padding: 24px; display: flex; flex-direction: column; gap: 22px; align-items: center; }
  .frameBlock { width: 1240px; }
  .frameTitle { display: flex; gap: 10px; color: #ddd; text-decoration: none; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 6px; }
  .frameTitle span { color: #666; }
  iframe { width: 1240px; height: 980px; border: 1px solid #222; display: block; }
</style>
</head>
<body>
${frames}
</body>
</html>
`;
}

const loaded = loadThemes().filter((theme) => (ONLY ? theme.raw.id === ONLY : true));
if (process.exitCode) process.exit();
if (loaded.length === 0) {
  console.error("error: no themes to preview");
  process.exit(1);
}
const themeById = Object.fromEntries(loaded.map((theme) => [theme.raw.id, theme]));
mkdirSync(join(ROOT, "build"), { recursive: true });
for (const theme of loaded) {
  writeFileSync(join(ROOT, `build/theme-${theme.raw.id}.html`), mockPage(theme));
  console.log(`wrote build/theme-${theme.raw.id}.html`);
}
if (!ONLY) {
  writeFileSync(join(ROOT, "build/preview.html"), combinedPage(loaded));
  console.log("wrote build/preview.html");
}
