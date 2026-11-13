#!/usr/bin/env node
/**
 * Build `lib/client.js` from `src/`.
 *
 *   1. load every `src/themes/*.json`, derive the full token set and validate;
 *   2. inline themes, locale dictionaries, row styles and effect styles into
 *      the lazy-CJS client template;
 *   3. write `lib/client.js` (the host serves this bundle as-is) and
 *      `build/themes.json` (derived tokens, useful for audits and previews).
 *
 * Usage:
 *   node scripts/build.mjs           # build, fail on schema/contrast errors
 *   node scripts/build.mjs --check   # validate only (no write)
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareTheme } from "./lib/derive.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const CHECK_ONLY = process.argv.includes("--check");

/** Static copy for the Appearance row; per-theme copy is added from each JSON. */
const STATIC_COPY = {
  en: {
    title: "Futuristic themes",
    description:
      "Four cinematic themes for DeepSeek Harness: three dark terminal-grade skins and one light architectural one. Every theme replaces the whole palette and adds an optional decorative layer.",
    "state.active": "Active",
    "default.label": "Standard appearance",
    "default.tagline": "Built-in light / dark",
    "default.description": "Return to the built-in light or dark appearance selected before.",
    "effects.label": "Decorative effects",
    hint: "Inter / IBM Plex Mono · light & dark · reduced-motion safe",
  },
  zh: {
    title: "未来主义主题",
    description:
      "为 DeepSeek Harness 提供的四套电影感主题：三套深色终端风格与一套明亮建筑风格。每套主题替换整套配色，并提供可关闭的装饰层。",
    "state.active": "使用中",
    "default.label": "标准外观",
    "default.tagline": "内置浅色 / 深色",
    "default.description": "返回之前选择的内置浅色或深色外观。",
    "effects.label": "装饰效果",
    hint: "Inter / IBM Plex Mono · 浅色与深色 · 尊重减少动态效果设置",
  },
};

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function listThemeFiles() {
  const dir = join(ROOT, "src/themes");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => join(dir, name));
}

function main() {
  const pkg = readJson(join(ROOT, "package.json"));
  const errors = [];
  const warnings = [];
  const themes = [];
  const seen = new Set();

  for (const file of listThemeFiles()) {
    let raw;
    try {
      raw = readJson(file);
    } catch (error) {
      errors.push(`${file}: invalid JSON — ${error.message}`);
      continue;
    }
    const prepared = prepareTheme(raw);
    errors.push(...prepared.errors);
    warnings.push(...prepared.warnings);
    if (prepared.errors.length > 0) continue;
    if (seen.has(raw.id)) {
      errors.push(`${file}: duplicate theme id "${raw.id}"`);
      continue;
    }
    seen.add(raw.id);
    themes.push({
      id: raw.id,
      colorScheme: raw.colorScheme,
      label: raw.label,
      description: raw.description,
      tagline: raw.tagline,
      accent: raw.accent ?? raw.roles.primary,
      swatches: raw.swatches,
      preview: raw.preview ?? {},
      tokens: prepared.tokens,
    });
  }

  if (themes.length === 0) errors.push("no themes found in src/themes/*.json");
  if (themes.length > 0) {
    const ids = themes.map((theme) => theme.id).join(", ");
    console.log(`themes (${themes.length}): ${ids}`);
  }

  for (const warning of warnings) console.warn(`warning: ${warning}`);
  if (errors.length > 0) {
    for (const error of errors) console.error(`error: ${error}`);
    process.exitCode = 1;
    return;
  }

  // Locale dictionaries: static copy + per-theme label / tagline / description.
  const locale = { en: { ...STATIC_COPY.en }, zh: { ...STATIC_COPY.zh } };
  for (const theme of themes) {
    for (const lang of ["en", "zh"]) {
      locale[lang][`theme.${theme.id}.label`] = theme.label[lang];
      locale[lang][`theme.${theme.id}.tagline`] = theme.tagline[lang];
      locale[lang][`theme.${theme.id}.description`] = theme.description[lang];
    }
  }

  const rowCss = readText(join(ROOT, "src/base.css")) + "\n" + readText(join(ROOT, "src/row.css"));
  const effectsDir = join(ROOT, "src/effects");
  const effectFiles = existsSync(effectsDir)
    ? readdirSync(effectsDir)
        .filter((name) => name.endsWith(".css"))
        .sort()
    : [];
  const effectsCss = effectFiles.map((name) => readText(join(effectsDir, name))).join("\n");

  const template = readText(join(ROOT, "src/client.template.js"));
  const replacements = {
    "__THEMES__": JSON.stringify(themes.map(stripForClient)),
    "__ROW_CSS__": JSON.stringify(rowCss),
    "__EFFECTS_CSS__": JSON.stringify(effectsCss),
    "__LOCALE_EN__": JSON.stringify(locale.en),
    "__LOCALE_ZH__": JSON.stringify(locale.zh),
    "@PLUGIN_ID@": pkg.name,
  };
  let output = template;
  for (const [token, value] of Object.entries(replacements)) {
    output = output.split(token).join(value);
  }
  if (output.includes("@PLUGIN_ID@") || /__[A-Z_]+__/.test(output)) {
    console.error("error: template still contains unreplaced placeholders");
    process.exitCode = 1;
    return;
  }

  if (CHECK_ONLY) {
    console.log("check ok");
    return;
  }

  mkdirSync(join(ROOT, "lib"), { recursive: true });
  mkdirSync(join(ROOT, "build"), { recursive: true });
  writeFileSync(join(ROOT, "lib/client.js"), output);
  writeFileSync(
    join(ROOT, "build/themes.json"),
    JSON.stringify(
      themes.map((theme) => ({ id: theme.id, colorScheme: theme.colorScheme, tokens: theme.tokens })),
      null,
      2,
    ),
  );
  console.log(`wrote lib/client.js (${(output.length / 1024).toFixed(1)} KiB, ${themes.length} themes)`);
}

/** The client bundle does not need authoring-only fields. */
function stripForClient(theme) {
  return {
    id: theme.id,
    colorScheme: theme.colorScheme,
    label: theme.label,
    description: theme.description,
    tagline: theme.tagline,
    accent: theme.accent,
    swatches: theme.swatches,
    preview: theme.preview,
    tokens: theme.tokens,
  };
}

main();
