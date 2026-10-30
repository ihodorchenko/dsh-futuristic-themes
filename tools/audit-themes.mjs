#!/usr/bin/env node
/**
 * Independent audit harness for the `dsh-futuristic-themes` plugin.
 *
 * This tool is deliberately independent from the plugin's own build: it reads
 * the plugin sources, re-derives every theme through the plugin's authoring
 * library (`scripts/lib/derive.mjs`, imported — not duplicated), checks the
 * static package shape and the built client bundle, and prints a PASS/FAIL
 * report. It never writes into the plugin and never touches a running server.
 *
 * Sections
 *   A. Package shape              package.json / cordis.patch.yml / skin.json /
 *                                 exports / lib/index.js / lib/client.js syntax
 *   B. Theme completeness         every src/themes/*.json derives, carries the
 *                                 required tokens, valid ids and copy
 *   C. Contrast matrix            WCAG ratios for the semantic token pairs
 *   D. Effects CSS discipline     effects sheets may only paint the plugin
 *                                 overlay, gated by theme + effects attributes
 *   E. Built bundle truth         `scripts/build.mjs --check` passes and
 *                                 lib/client.js was rebuilt from current sources
 *
 * Usage (bundled node is not on PATH):
 *   NODE=$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node
 *   "$NODE" tools/audit-themes.mjs
 *   "$NODE" tools/audit-themes.mjs --plugin /path/to/dsh-futuristic-themes --json /tmp/audit.json
 *
 * Exit codes: 0 = no hard failure, 1 = at least one hard FAIL, 2 = harness
 * usage error. Contrast findings are WARN, not hard failures (the contract
 * treats them as build warnings), so the exit code never hides real mechanical
 * defects behind draft palettes.
 *
 * The audit is defensive on purpose: it is expected to be run while designers
 * are still editing theme files. A file that is mid-write is reported as a
 * FAIL for that one check and the rest of the audit keeps going.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/* --------------------------------------------------------------------- paths */

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = resolve(HERE, "..");
const DEFAULT_PLUGIN = join(WORKSPACE, "dsh-futuristic-themes");
const DEFAULT_REPORT = join(WORKSPACE, "docs", "qa", "audit-report.json");

const VERSION = "1.0.0";

/** Themes `docs/THEME-CONTRACT.md` promises. */
const CONTRACT_THEME_IDS = Object.freeze(["nostromo-amber", "omni-tool", "renaissance-steel"]);

/** Ids reserved by the host theme registry. */
const RESERVED_IDS = Object.freeze(["system", "light", "dark", "auto"]);

/** Shared theme-schema keys (anything else is a typo worth surfacing). */
const THEME_TOP_KEYS = new Set([
  "id",
  "colorScheme",
  "label",
  "tagline",
  "description",
  "accent",
  "swatches",
  "roles",
  "overrides",
  "preview",
]);

/** Roles that must be plain opaque `#rrggbb` colours; the other two are raw CSS. */
const RAW_ROLE_KEYS = new Set(["sidebarFill", "menuFill"]);

/** Fallback role list for diagnostics when `derive.mjs` cannot be imported. */
const DOCUMENTED_ROLES = new Set([
  "bg",
  "bgDeep",
  "surface1",
  "surface2",
  "surface3",
  "overlay",
  "border",
  "dim",
  "text",
  "secondary",
  "primary",
  "bright",
  "warning",
  "ok",
  "info",
  "sidebarFill",
  "menuFill",
]);

/** Preview payloads the theme design tasks explicitly promise (soft check). */
const PREVIEW_SPEC = Object.freeze({
  "nostromo-amber": { kind: "warning", text: "High load detected", metrics: "bars" },
  "omni-tool": { kind: "info", text: "Processing batch...", metrics: "gauge" },
  "renaissance-steel": { kind: "success", text: "All systems nominal", metrics: "bars" },
});

const NOTIFICATION_KINDS = new Set(["warning", "info", "success"]);
const METRICS_KINDS = new Set(["bars", "gauge"]);

/**
 * WCAG pairs the audit prints. `min` follows the contract: 4.5:1 for primary
 * text on app/raised surfaces, 3:1 for secondary grades and accents.
 */
const CONTRAST_PAIRS = Object.freeze([
  { key: "text-bg", fg: "--dsw-alias-label-primary", bg: "--dsw-alias-bg-base", min: 4.5, label: "primary text on app background" },
  { key: "text-surface1", fg: "--dsw-alias-label-primary", bg: "--dsw-alias-bg-layer-1", min: 4.5, label: "primary text on raised surface" },
  { key: "text-surface2", fg: "--dsw-alias-label-primary", bg: "--dsw-alias-bg-layer-2", min: 4.5, label: "primary text on nested surface" },
  { key: "text-surface3", fg: "--dsw-alias-label-primary", bg: "--dsw-alias-bg-layer-3", min: 4.5, label: "primary text on menu surface" },
  { key: "secondary-bg", fg: "--dsw-alias-label-secondary", bg: "--dsw-alias-bg-base", min: 3.0, label: "secondary text on app background" },
  { key: "tertiary-bg", fg: "--dsw-alias-label-tertiary", bg: "--dsw-alias-bg-base", min: 3.0, label: "tertiary text on app background" },
  { key: "caption-bg", fg: "--dsw-alias-label-caption", bg: "--dsw-alias-bg-base", min: 3.0, label: "caption text on app background" },
  { key: "primary-bg", fg: "--dsw-alias-brand-primary", bg: "--dsw-alias-bg-base", min: 3.0, label: "brand accent on app background" },
  { key: "warning-bg", fg: "--dsw-alias-state-warn-primary", bg: "--dsw-alias-bg-base", min: 3.0, label: "warning colour on app background" },
  { key: "success-bg", fg: "--dsw-alias-state-success-primary", bg: "--dsw-alias-bg-base", min: 3.0, label: "success colour on app background" },
  { key: "info-bg", fg: "--dsw-alias-label-deep-diving", bg: "--dsw-alias-bg-base", min: 3.0, label: "info signal on app background" },
  { key: "button-label", fg: "--dsw-alias-label-primary-foreground", bg: "--dsw-alias-brand-primary", min: 3.0, label: "button label on accent fill" },
]);

const HELP = `Independent audit harness for the dsh-futuristic-themes plugin.

Usage:
  node tools/audit-themes.mjs [options]

Options:
  --plugin <dir>   plugin directory (default: <workspace>/dsh-futuristic-themes)
  --json <path>    report JSON path (default: <workspace>/docs/qa/audit-report.json)
  --no-json        do not write the report JSON
  --strict         treat WARN findings as failures for the exit code
  --quiet          print only FAIL / WARN lines plus the summary
  --help           show this help

Sections: A package shape, B theme completeness, C contrast matrix,
D effects CSS discipline, E built bundle truth.

Exit code: 0 = no hard FAIL, 1 = hard FAIL(s), 2 = usage error.
Contrast findings are WARN by design (the build treats them as warnings).`;

/* ------------------------------------------------------------------- harness */

/** All recorded checks, in insertion order. */
const checks = [];

function add(section, id, title, status, detail) {
  checks.push({
    section,
    id,
    title,
    status,
    detail: detail === undefined || detail === null ? null : String(detail),
  });
}

const pass = (section, id, title, detail) => add(section, id, title, "PASS", detail);
const fail = (section, id, title, detail) => add(section, id, title, "FAIL", detail);
const warn = (section, id, title, detail) => add(section, id, title, "WARN", detail);
const info = (section, id, title, detail) => add(section, id, title, "INFO", detail);
const skip = (section, id, title, detail) => add(section, id, title, "SKIP", detail);

function shorten(value, limit = 500) {
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function escapeRe(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function listFiles(dir, extension) {
  try {
    return readdirSync(dir)
      .filter((name) => name.endsWith(extension))
      .sort()
      .map((name) => join(dir, name));
  } catch {
    return null;
  }
}

function readTextFile(path) {
  try {
    return { ok: true, text: readFileSync(path, "utf8") };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function readJsonFile(path) {
  const read = readTextFile(path);
  if (!read.ok) return { ok: false, error: read.error };
  try {
    return { ok: true, value: JSON.parse(read.text) };
  } catch (error) {
    return { ok: false, error: `invalid JSON: ${error.message}` };
  }
}

function nodeVersion() {
  return process.version;
}

/* --------------------------------------------------------- JSON-in-waveform */

/**
 * Extract one JSON value inlined into the built client bundle. The bundle is
 * hand-written lazy CJS with `var X = <json>;` assignments, so a small balanced
 * scanner is enough and does not depend on the plugin's template content.
 *
 * @param {string} text bundle text.
 * @param {string} marker e.g. `"var THEMES = "`.
 * @returns {{value?: unknown, raw?: string, error?: string}}
 */
function extractJsonValueAfter(text, marker) {
  const at = text.indexOf(marker);
  if (at === -1) return { error: `marker ${JSON.stringify(marker)} not found` };
  let i = at + marker.length;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  if (i >= text.length) return { error: "end of file after marker" };
  const start = i;
  const first = text[i];

  if (first === '"' || first === "'") {
    const quote = first;
    let escaped = false;
    for (i = start + 1; i < text.length; i += 1) {
      const ch = text[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === quote) {
        const raw = text.slice(start, i + 1);
        try {
          return { value: JSON.parse(raw), raw };
        } catch (error) {
          return { error: `invalid JSON string: ${error.message}` };
        }
      }
    }
    return { error: "unterminated string literal" };
  }

  if (first !== "{" && first !== "[") return { error: `unexpected token ${JSON.stringify(first)}` };

  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;
  for (i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      continue;
    }
    if (ch === "{" || ch === "[") depth += 1;
    else if (ch === "}" || ch === "]") {
      depth -= 1;
      if (depth === 0) {
        const raw = text.slice(start, i + 1);
        try {
          return { value: JSON.parse(raw), raw };
        } catch (error) {
          return { error: `invalid JSON value: ${error.message}` };
        }
      }
    }
  }
  return { error: "unterminated JSON value" };
}

/* --------------------------------------------------------------------- CSS */

/** Remove block comments; keeps the document length-ish irrelevant to callers. */
function stripCssComments(css) {
  let out = "";
  let i = 0;
  while (i < css.length) {
    if (css[i] === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end === -1 ? css.length : end + 2;
      out += " ";
      continue;
    }
    out += css[i];
    i += 1;
  }
  return out;
}

/**
 * Split a comma list, ignoring commas inside brackets/parens/strings. Enough
 * for selectors and simple CSS values in this plugin.
 */
function splitTopLevel(text, separator) {
  const parts = [];
  let buffer = "";
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      buffer += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      buffer += ch;
      continue;
    }
    if (ch === "(" || ch === "[") depth += 1;
    else if (ch === ")" || ch === "]") depth = Math.max(0, depth - 1);
    else if (ch === separator && depth === 0) {
      parts.push(buffer);
      buffer = "";
      continue;
    }
    buffer += ch;
  }
  if (buffer.trim() !== "" || parts.length > 0) parts.push(buffer);
  return parts.map((part) => part.trim()).filter((part) => part !== "");
}

/**
 * Minimal block parser: top-level rules and `@media` / `@keyframes` blocks.
 * Returns a flat rule list; `@media` rules carry one entry per inner rule with
 * their media context attached (used to recognise reduced-motion guards).
 *
 * @param {string} css comment-stripped stylesheet.
 * @param {string[]} context media conditions inherited from outer blocks.
 * @returns {{selector: string, declarations: string, context: string[]}[]}
 */
function parseCssRules(css, context = []) {
  const rules = [];
  let i = 0;
  while (i < css.length) {
    while (i < css.length && /\s/.test(css[i])) i += 1;
    if (i >= css.length) break;

    if (css[i] === "@") {
      const start = i;
      while (i < css.length && css[i] !== "{" && css[i] !== ";") i += 1;
      const header = css.slice(start, i).trim();
      if (i >= css.length || css[i] === ";") {
        i += 1;
        continue;
      }
      // Find the matching close brace for this block.
      let depth = 0;
      let inString = false;
      let quote = "";
      let escaped = false;
      let end = -1;
      for (let j = i; j < css.length; j += 1) {
        const ch = css[j];
        if (inString) {
          if (escaped) escaped = false;
          else if (ch === "\\") escaped = true;
          else if (ch === quote) inString = false;
          continue;
        }
        if (ch === '"' || ch === "'") {
          inString = true;
          quote = ch;
          continue;
        }
        if (ch === "{") depth += 1;
        else if (ch === "}") {
          depth -= 1;
          if (depth === 0) {
            end = j;
            break;
          }
        }
      }
      if (end === -1) break;
      const body = css.slice(i + 1, end);
      if (/^@media\b/i.test(header)) rules.push(...parseCssRules(body, [...context, header]));
      i = end + 1;
      continue;
    }

    // Selector up to the next `{`.
    const selectorStart = i;
    while (i < css.length && css[i] !== "{") i += 1;
    if (i >= css.length) break;
    const selector = css.slice(selectorStart, i).trim();
    // Declarations: balanced braces (strings may contain them).
    let depth = 0;
    let inString = false;
    let quote = "";
    let escaped = false;
    let end = -1;
    for (let j = i; j < css.length; j += 1) {
      const ch = css[j];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === quote) inString = false;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inString = true;
        quote = ch;
        continue;
      }
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    if (end === -1) break;
    const declarations = css.slice(i + 1, end);
    if (selector !== "") rules.push({ selector, declarations, context });
    i = end + 1;
  }
  return rules;
}

/* ------------------------------------------------------------------ colours */

const HEX_FULL = /^#[0-9a-f]{6}$/i;
const HEX_ANY = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function isPlainHex(value) {
  return typeof value === "string" && HEX_ANY.test(value.trim());
}

/* --------------------------------------------------------------- arguments */

function parseArgs(argv) {
  const opts = {
    pluginRoot: DEFAULT_PLUGIN,
    reportPath: DEFAULT_REPORT,
    writeReport: true,
    strict: false,
    quiet: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--plugin") {
      const value = argv[i + 1];
      if (!value) throw new Error("--plugin needs a directory");
      opts.pluginRoot = value;
      i += 1;
    } else if (arg === "--json") {
      const value = argv[i + 1];
      if (!value) throw new Error("--json needs a path");
      opts.reportPath = value;
      i += 1;
    } else if (arg === "--no-json") {
      opts.writeReport = false;
    } else if (arg === "--strict") {
      opts.strict = true;
    } else if (arg === "--quiet") {
      opts.quiet = true;
    } else if (arg === "--help" || arg === "-h") {
      opts.help = true;
    } else {
      throw new Error(`unknown argument ${JSON.stringify(arg)} (try --help)`);
    }
  }
  opts.pluginRoot = isAbsolute(opts.pluginRoot) ? resolve(opts.pluginRoot) : resolve(process.cwd(), opts.pluginRoot);
  opts.reportPath = isAbsolute(opts.reportPath) ? resolve(opts.reportPath) : resolve(process.cwd(), opts.reportPath);
  return opts;
}

/* ------------------------------------------------------------------ state */

function collectThemes(state) {
  const themeDir = join(state.pluginRoot, "src", "themes");
  const files = listFiles(themeDir, ".json");
  const records = [];
  if (files === null) return { themeDir, files: null, records };
  for (const file of files) {
    const stem = basename(file, ".json");
    const record = {
      stem,
      file,
      json: null,
      parseError: null,
      tokens: null,
      deriveError: null,
      prepareErrors: [],
      prepareWarnings: [],
    };
    const read = readJsonFile(file);
    if (!read.ok) record.parseError = read.error;
    else record.json = read.value;
    records.push(record);
  }
  return { themeDir, files, records };
}

/* ================================================================ section A */

async function auditPackageShape(state) {
  const section = "A. Package shape";
  const root = state.pluginRoot;

  const rootOk = existsSync(root) && isDirectory(root);
  add(section, "A1", "plugin root directory exists", rootOk ? "PASS" : "FAIL", root);
  if (!rootOk) {
    fail(section, "A2", "package.json is readable JSON", `plugin root ${root} is not a directory`);
    return;
  }

  const pkgRead = readJsonFile(join(root, "package.json"));
  if (!pkgRead.ok) {
    fail(section, "A2", "package.json is readable JSON", pkgRead.error);
    return;
  }
  pass(section, "A2", "package.json is readable JSON");
  const pkg = pkgRead.value;
  state.pkg = pkg;

  const nameOk = typeof pkg.name === "string" && pkg.name.trim() !== "";
  add(section, "A3", "package.json has a package name", nameOk ? "PASS" : "FAIL", nameOk ? pkg.name : `got ${JSON.stringify(pkg.name)}`);
  const pkgName = nameOk ? pkg.name.trim() : "dsh-futuristic-themes";

  // dsh.bundle.patch -> cordis.patch.yml on disk.
  const patchPath = pkg?.dsh?.bundle?.patch;
  const patchOk = typeof patchPath === "string" && patchPath.trim() !== "";
  add(section, "A4", "dsh.bundle.patch is declared", patchOk ? "PASS" : "FAIL", patchOk ? patchPath : "missing dsh.bundle.patch");
  if (patchOk) {
    const resolved = join(root, patchPath);
    add(
      section,
      "A5",
      "dsh.bundle.patch file exists",
      existsSync(resolved) ? "PASS" : "FAIL",
      resolved,
    );
    const patchRead = readTextFile(resolved);
    if (!patchRead.ok) {
      fail(section, "A6", "cordis.patch.yml inserts an entry named after the package", patchRead.error);
    } else if (!/\binsert\s*:/m.test(patchRead.text)) {
      fail(section, "A6", "cordis.patch.yml inserts an entry named after the package", "no `insert:` layer in cordis.patch.yml");
    } else if (!new RegExp(`(^|\\n)\\s*name\\s*:\\s*["']?${escapeRe(pkgName)}["']?\\s*(#.*)?$`, "m").test(patchRead.text)) {
      fail(section, "A6", "cordis.patch.yml inserts an entry named after the package", `no entry with name: ${pkgName}`);
    } else {
      pass(section, "A6", "cordis.patch.yml inserts an entry named after the package", pkgName);
    }
  }

  // dsh.client declaration.
  const clientDecl = pkg?.dsh?.client;
  const platformOk = clientDecl && clientDecl.platform === "web";
  add(
    section,
    "A7",
    "dsh.client declares platform web",
    platformOk ? "PASS" : "FAIL",
    platformOk ? "web" : `got ${JSON.stringify(clientDecl?.platform)}`,
  );

  // exports["./client"] resolves to a real file.
  const exportClient = resolveExportTarget(pkg?.exports?.["./client"]);
  const exportClientExists = typeof exportClient === "string" && existsSync(join(root, exportClient));
  add(
    section,
    "A8",
    'package exports["./client"] resolves to a file',
    exportClientExists ? "PASS" : "FAIL",
    exportClientExists ? exportClient : `exports["./client"] = ${JSON.stringify(pkg?.exports?.["./client"])}`,
  );

  // exports["."] / main resolves.
  const exportMain = resolveExportTarget(pkg?.exports?.["."]) ?? (typeof pkg?.main === "string" ? pkg.main : null);
  const exportMainExists = typeof exportMain === "string" && existsSync(join(root, exportMain));
  add(
    section,
    "A9",
    "package main entry resolves to a file",
    exportMainExists ? "PASS" : "FAIL",
    exportMainExists ? exportMain : `main = ${JSON.stringify(pkg?.main)}`,
  );

  // files whitelist must ship the built bundle.
  const files = Array.isArray(pkg?.files) ? pkg.files.filter((entry) => typeof entry === "string") : null;
  const clientListed = files !== null && files.includes("lib/client.js");
  add(
    section,
    "A10",
    "package files whitelist includes lib/client.js",
    clientListed ? "PASS" : "FAIL",
    files === null ? "no package.files array" : `files: ${files.join(", ")}`,
  );
  if (files !== null) {
    const missing = files.filter((entry) => !existsSync(join(root, entry)));
    add(
      section,
      "A11",
      "every file listed in package.files exists",
      missing.length === 0 ? "PASS" : "WARN",
      missing.length === 0 ? `${files.length} files present` : `missing: ${missing.join(", ")}`,
    );
  }

  // dsh.client.inject must pull in the services the browser half uses.
  const inject = Array.isArray(clientDecl?.inject) ? clientDecl.inject : [];
  const requiredProvides = ["@deepseek-ai/dsh-client-locale", "@deepseek-ai/dsh-client-ui-theme"];
  const missingInject = requiredProvides.filter((entry) => !inject.includes(entry));
  add(
    section,
    "A12",
    "dsh.client.inject includes the locale + theme client packages",
    missingInject.length === 0 ? "PASS" : "FAIL",
    missingInject.length === 0 ? requiredProvides.join(", ") : `missing: ${missingInject.join(", ")}`,
  );

  // skin.json.
  const skinRead = readJsonFile(join(root, "skin.json"));
  if (!skinRead.ok) {
    fail(section, "A13", "skin.json is readable JSON", skinRead.error);
    fail(section, "A14", "skin.json has a string id", "skin.json unreadable");
    fail(section, "A15", "skin.json entry resolves and lists the three theme ids", "skin.json unreadable");
  } else {
    pass(section, "A13", "skin.json is readable JSON");
    const skin = skinRead.value;
    add(
      section,
      "A14",
      "skin.json has a string id",
      typeof skin?.id === "string" && skin.id.trim() !== "" ? "PASS" : "FAIL",
      typeof skin?.id === "string" ? skin.id : `got ${JSON.stringify(skin?.id)}`,
    );
    const entryOk = typeof skin?.entry === "string" && existsSync(join(root, skin.entry));
    const skinThemes = Array.isArray(skin?.themes) ? skin.themes.filter((id) => typeof id === "string") : null;
    const diskIds = state.themeFiles === null ? null : state.themeFiles.map((file) => basename(file, ".json"));
    const setEqual = skinThemes !== null && diskIds !== null && skinThemes.length === diskIds.length && [...skinThemes].sort().join("|") === [...diskIds].sort().join("|");
    add(
      section,
      "A15",
      "skin.json entry resolves and lists every src/themes id",
      entryOk && setEqual ? "PASS" : "FAIL",
      entryOk
        ? setEqual
          ? `${skin.entry} -> [${skinThemes.join(", ")}]`
          : `skin themes ${JSON.stringify(skin?.themes)} vs src/themes ${JSON.stringify(diskIds)}`
        : `entry ${JSON.stringify(skin?.entry)} does not resolve`,
    );
  }

  // lib/client.js exists and is syntactically valid.
  const clientPath = join(root, "lib", "client.js");
  const clientRead = readTextFile(clientPath);
  add(
    section,
    "A16",
    "lib/client.js exists and is not empty",
    clientRead.ok && clientRead.text.trim() !== "" ? "PASS" : "FAIL",
    clientRead.ok ? `${(clientRead.text.length / 1024).toFixed(1)} KiB` : clientRead.error,
  );
  if (clientRead.ok) {
    const check = spawnSync(process.execPath, ["--check", clientPath], { encoding: "utf8", timeout: 30000 });
    if (check.error) fail(section, "A17", "lib/client.js passes `node --check`", check.error.message);
    else if (check.status === 0) pass(section, "A17", "lib/client.js passes `node --check`");
    else fail(section, "A17", "lib/client.js passes `node --check`", shorten(check.stderr || check.stdout, 300));
  } else {
    fail(section, "A17", "lib/client.js passes `node --check`", "lib/client.js missing");
  }

  // lib/index.js must expose apply().
  const indexPath = join(root, "lib", "index.js");
  if (!existsSync(indexPath)) {
    fail(section, "A18", "lib/index.js exports an apply() function", "lib/index.js missing");
  } else {
    try {
      const mod = await import(pathToFileURL(indexPath).href);
      const applyOk = typeof mod.apply === "function";
      add(section, "A18", "lib/index.js exports an apply() function", applyOk ? "PASS" : "FAIL", applyOk ? "typeof apply === function" : `exports: ${Object.keys(mod).join(", ") || "(none)"}`);
    } catch (error) {
      fail(section, "A18", "lib/index.js exports an apply() function", `import failed: ${error.message}`);
    }
  }
}

function resolveExportTarget(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    if (typeof value.default === "string") return value.default;
    for (const entry of Object.values(value)) {
      if (typeof entry === "string") return entry;
    }
  }
  return null;
}

/* ================================================================ section B */

function auditThemeCompleteness(state) {
  const section = "B. Theme completeness";
  const { records } = state.themes;

  if (state.themeFiles === null) {
    fail(section, "B1", "src/themes is readable and contains theme JSON files", "src/themes directory missing or unreadable");
    return;
  }
  add(section, "B1", "src/themes is readable and contains theme JSON files", records.length > 0 ? "PASS" : "FAIL", `${records.length} file(s): ${records.map((r) => r.stem).join(", ")}`);

  const fileIds = records.map((record) => record.stem);
  const missingContract = CONTRACT_THEME_IDS.filter((id) => !fileIds.includes(id));
  add(
    section,
    "B2",
    "all three contract themes are present",
    missingContract.length === 0 ? "PASS" : "FAIL",
    missingContract.length === 0 ? CONTRACT_THEME_IDS.join(", ") : `missing: ${missingContract.join(", ")}`,
  );
  const unexpected = fileIds.filter((id) => !CONTRACT_THEME_IDS.includes(id));
  if (unexpected.length > 0) {
    warn(section, "B3", "no unexpected theme files", `extra: ${unexpected.join(", ")}`);
  } else {
    pass(section, "B3", "no unexpected theme files");
  }

  const parsed = records.filter((record) => record.json !== null);
  const seen = new Map();
  const duplicates = [];
  for (const record of parsed) {
    if (typeof record.json?.id !== "string") continue;
    if (seen.has(record.json.id)) duplicates.push(`${seen.get(record.json.id)} + ${basename(record.file)} => ${record.json.id}`);
    else seen.set(record.json.id, basename(record.file));
  }
  add(section, "B4", "theme ids are unique across files", duplicates.length === 0 ? "PASS" : "FAIL", duplicates.length === 0 ? `${parsed.length} parsed theme(s)` : duplicates.join("; "));

  if (!state.derive) {
    fail(section, "B5", "scripts/lib/derive.mjs loads", state.deriveError ?? "derive module unavailable");
  } else {
    pass(section, "B5", "scripts/lib/derive.mjs loads");
  }

  for (const record of records) {
    const key = record.stem;
    if (record.json === null) {
      fail(section, `B:${key}:json`, `${basename(record.file)} parses as JSON`, record.parseError);
      continue;
    }
    const theme = record.json;

    // id: format, file-name match, reserved words, duplicates (section-level).
    const idProblems = [];
    if (typeof theme.id !== "string" || theme.id.trim() === "") idProblems.push(`id is ${JSON.stringify(theme.id)}`);
    else if (!/^[a-z0-9][a-z0-9-]*$/.test(theme.id)) idProblems.push(`id "${theme.id}" is not lowercase/digits/hyphens`);
    if (typeof theme.id === "string" && theme.id !== key) idProblems.push(`id "${theme.id}" does not match file name "${key}.json"`);
    add(section, `B:${key}:id`, `${key}: id is valid and matches the file name`, idProblems.length === 0 ? "PASS" : "FAIL", idProblems.join("; ") || theme.id);
    const reserved = typeof theme.id === "string" && RESERVED_IDS.includes(theme.id);
    add(section, `B:${key}:id-reserved`, `${key}: id is not reserved by the host`, reserved ? "FAIL" : "PASS", reserved ? `"${theme.id}" is reserved (${RESERVED_IDS.join(", ")})` : theme.id);

    // colour scheme.
    add(
      section,
      `B:${key}:scheme`,
      `${key}: colorScheme is "dark"`,
      theme.colorScheme === "dark" ? "PASS" : "FAIL",
      theme.colorScheme === "dark" ? "dark" : `got ${JSON.stringify(theme.colorScheme)}`,
    );

    // localized copy.
    const copyProblems = [];
    for (const field of ["label", "tagline", "description"]) {
      for (const lang of ["en", "zh"]) {
        const value = theme[field]?.[lang];
        if (typeof value !== "string" || value.trim() === "") copyProblems.push(`${field}.${lang}`);
      }
    }
    add(
      section,
      `B:${key}:copy`,
      `${key}: en+zh label, tagline and description are non-empty`,
      copyProblems.length === 0 ? "PASS" : "FAIL",
      copyProblems.length === 0 ? "6 strings" : `missing/empty: ${copyProblems.join(", ")}`,
    );

    // swatches.
    const swatches = Array.isArray(theme.swatches) ? theme.swatches : [];
    const countOk = swatches.length >= 4 && swatches.length <= 6;
    add(
      section,
      `B:${key}:swatches`,
      `${key}: 4–6 swatches`,
      countOk ? "PASS" : "FAIL",
      `${swatches.length} swatch(es)`,
    );
    const invalidSwatches = swatches.filter((value) => !isPlainHex(value));
    add(
      section,
      `B:${key}:swatches-hex`,
      `${key}: every swatch is a hex colour`,
      invalidSwatches.length === 0 ? "PASS" : "FAIL",
      invalidSwatches.length === 0 ? swatches.join(", ") : `invalid: ${JSON.stringify(invalidSwatches)}`,
    );

    // accent.
    const accentOk = isPlainHex(theme.accent);
    add(section, `B:${key}:accent`, `${key}: accent is a hex colour`, accentOk ? "PASS" : "FAIL", accentOk ? theme.accent : `got ${JSON.stringify(theme.accent)}`);
    if (accentOk && typeof theme.roles?.primary === "string" && theme.accent.toLowerCase() !== theme.roles.primary.toLowerCase()) {
      warn(section, `B:${key}:accent-primary`, `${key}: accent matches roles.primary`, `accent ${theme.accent} vs roles.primary ${theme.roles.primary}`);
    }

    // preview payload (schema + task spec).
    const preview = theme.preview;
    const previewProblems = [];
    if (!preview || typeof preview !== "object") {
      previewProblems.push("preview missing");
    } else {
      if (!NOTIFICATION_KINDS.has(preview.notification?.kind)) previewProblems.push(`notification.kind ${JSON.stringify(preview.notification?.kind)}`);
      if (typeof preview.notification?.text !== "string" || preview.notification.text.trim() === "") previewProblems.push("notification.text");
      if (!METRICS_KINDS.has(preview.metrics)) previewProblems.push(`metrics ${JSON.stringify(preview.metrics)}`);
    }
    add(
      section,
      `B:${key}:preview`,
      `${key}: preview payload is schema-valid`,
      previewProblems.length === 0 ? "PASS" : "FAIL",
      previewProblems.length === 0 ? `${preview.notification.kind} / ${preview.metrics}` : previewProblems.join("; "),
    );
    const spec = PREVIEW_SPEC[key];
    if (spec && preview) {
      const deviations = [];
      if (preview.notification?.kind !== spec.kind) deviations.push(`kind ${JSON.stringify(preview.notification?.kind)} != ${spec.kind}`);
      if (preview.notification?.text !== spec.text) deviations.push(`text ${JSON.stringify(preview.notification?.text)} != ${JSON.stringify(spec.text)}`);
      if (preview.metrics !== spec.metrics) deviations.push(`metrics ${JSON.stringify(preview.metrics)} != ${spec.metrics}`);
      add(
        section,
        `B:${key}:preview-spec`,
        `${key}: preview matches the theme design task`,
        deviations.length === 0 ? "PASS" : "WARN",
        deviations.length === 0 ? `${spec.kind} "${spec.text}" / ${spec.metrics}` : deviations.join("; "),
      );
    }

    // raw roles.
    const rawProblems = [];
    for (const roleName of RAW_ROLE_KEYS) {
      if (theme.roles?.[roleName] !== undefined && typeof theme.roles[roleName] !== "string") rawProblems.push(`${roleName} is not a string`);
    }
    if (typeof theme.roles?.menuFill === "string" && !/^rgba?\(/i.test(theme.roles.menuFill.trim())) {
      rawProblems.push(`menuFill is not an rgba() fill: ${theme.roles.menuFill}`);
    }
    add(
      section,
      `B:${key}:raw-roles`,
      `${key}: raw sidebarFill/menuFill values are strings`,
      rawProblems.length === 0 ? "PASS" : "FAIL",
      rawProblems.length === 0 ? `${RAW_ROLE_KEYS.size} raw roles checked` : rawProblems.join("; "),
    );

    // overrides are part of the same escape hatch contract.
    const isTokenName = state.derive?.isThemeTokenName ?? ((name) => /^--dsw-(?:alias|specific)-/.test(name) || name === "--dsw-menu-surface-fill");
    const overrides = theme.overrides;
    if (overrides === undefined) {
      pass(section, `B:${key}:overrides`, `${key}: overrides (if any) are valid flat tokens`, "none");
    } else if (overrides === null || typeof overrides !== "object" || Array.isArray(overrides)) {
      fail(section, `B:${key}:overrides`, `${key}: overrides (if any) are valid flat tokens`, "overrides is not an object");
    } else {
      const overrideProblems = [];
      for (const [name, value] of Object.entries(overrides)) {
        if (!isTokenName(name)) overrideProblems.push(`${name} outside namespace`);
        if (typeof value !== "string") overrideProblems.push(`${name} is not a flat string`);
      }
      add(
        section,
        `B:${key}:overrides`,
        `${key}: overrides (if any) are valid flat tokens`,
        overrideProblems.length === 0 ? "PASS" : "FAIL",
        overrideProblems.length === 0 ? `${Object.keys(overrides).length} override(s)` : overrideProblems.join("; "),
      );
    }

    // role hygiene (warnings, not hard failures).
    const documentedRoles = state.derive?.ROLE_DOCS ? new Set(Object.keys(state.derive.ROLE_DOCS)) : DOCUMENTED_ROLES;
    const unknownRoles = Object.keys(theme.roles ?? {}).filter((role) => !documentedRoles.has(role));
    add(
      section,
      `B:${key}:roles-known`,
      `${key}: every role is documented`,
      unknownRoles.length === 0 ? "PASS" : "WARN",
      unknownRoles.length === 0 ? `${Object.keys(theme.roles ?? {}).length} roles` : `unknown: ${unknownRoles.join(", ")}`,
    );
    const nonHexRoles = Object.entries(theme.roles ?? {})
      .filter(([role, value]) => !RAW_ROLE_KEYS.has(role) && !HEX_FULL.test(String(value)))
      .map(([role]) => role);
    add(
      section,
      `B:${key}:roles-hex`,
      `${key}: colour roles are opaque #rrggbb`,
      nonHexRoles.length === 0 ? "PASS" : "WARN",
      nonHexRoles.length === 0 ? "all colour roles #rrggbb" : `not #rrggbb: ${nonHexRoles.join(", ")}`,
    );
    const unknownKeys = Object.keys(theme).filter((keyName) => !THEME_TOP_KEYS.has(keyName));
    add(
      section,
      `B:${key}:keys`,
      `${key}: no unknown top-level keys`,
      unknownKeys.length === 0 ? "PASS" : "WARN",
      unknownKeys.length === 0 ? Object.keys(theme).length + " keys" : `unknown: ${unknownKeys.join(", ")}`,
    );

    // derive the complete token set through the authoring library.
    if (!state.derive) {
      skip(section, `B:${key}:derive`, `${key}: roles derive the complete token set`, "derive module unavailable");
      continue;
    }
    try {
      record.tokens = state.derive.deriveTokens(theme);
      pass(section, `B:${key}:derive`, `${key}: roles derive the complete token set`, `${Object.keys(record.tokens).length} tokens`);
    } catch (error) {
      record.deriveError = error.message;
      fail(section, `B:${key}:derive`, `${key}: roles derive the complete token set`, error.message);
      continue;
    }

    // build validator parity.
    try {
      const prepared = state.derive.prepareTheme(theme);
      record.prepareErrors = prepared.errors;
      record.prepareWarnings = prepared.warnings;
      add(
        section,
        `B:${key}:prepare`,
        `${key}: build validator reports no schema errors`,
        prepared.errors.length === 0 ? "PASS" : "FAIL",
        prepared.errors.length === 0 ? `${prepared.warnings.length} contrast warning(s)` : prepared.errors.join("; "),
      );
    } catch (error) {
      record.prepareErrors = [error.message];
      fail(section, `B:${key}:prepare`, `${key}: build validator reports no schema errors`, error.message);
    }

    // required tokens, namespace, values.
    const tokens = record.tokens;
    const missingTokens = state.derive.REQUIRED_TOKENS.filter((name) => !(name in tokens));
    add(
      section,
      `B:${key}:tokens-required`,
      `${key}: all REQUIRED_TOKENS are present`,
      missingTokens.length === 0 ? "PASS" : "FAIL",
      missingTokens.length === 0 ? `${state.derive.REQUIRED_TOKENS.length} required tokens` : `missing: ${missingTokens.join(", ")}`,
    );
    const badNames = Object.keys(tokens).filter((name) => !state.derive.isThemeTokenName(name));
    add(
      section,
      `B:${key}:tokens-namespace`,
      `${key}: every token is in the --dsw-alias-/--dsw-specific- namespace`,
      badNames.length === 0 ? "PASS" : "FAIL",
      badNames.length === 0 ? `${Object.keys(tokens).length} token names` : `outside namespace: ${badNames.slice(0, 8).join(", ")}`,
    );
    const badValues = Object.entries(tokens).filter(([, value]) => typeof value !== "string" || value.trim() === "" || /\[object Object\]|undefined|^null$/i.test(value));
    add(
      section,
      `B:${key}:tokens-values`,
      `${key}: every token value is a flat CSS string`,
      badValues.length === 0 ? "PASS" : "FAIL",
      badValues.length === 0 ? "all values flattened strings" : badValues.slice(0, 6).map(([name, value]) => `${name}=${JSON.stringify(value)}`).join("; "),
    );

    // contrast warnings the plugin build would print.
    if (record.prepareWarnings.length > 0) {
      info(section, `B:${key}:contrast-warnings`, `${key}: build contrast warnings`, record.prepareWarnings.map((line) => line.replace(`${key}: `, "")).join(" | "));
    }
  }
}

/* ================================================================ section C */

function auditContrast(state) {
  const section = "C. Contrast matrix";
  const records = state.themes.records.filter((record) => record.tokens !== null);
  if (records.length === 0) {
    skip(section, "C0", "contrast matrix computed", "no theme derived successfully");
    return;
  }
  if (!state.derive) {
    skip(section, "C0", "contrast matrix computed", "derive module unavailable");
    return;
  }

  for (const record of records) {
    const key = record.stem;
    const tokens = record.tokens;
    let below = 0;
    for (const pair of CONTRAST_PAIRS) {
      const fg = tokens[pair.fg];
      const bg = tokens[pair.bg];
      let ratio = null;
      let problem = null;
      try {
        ratio = state.derive.contrast(fg, bg);
      } catch (error) {
        problem = `cannot parse ${JSON.stringify(fg)} / ${JSON.stringify(bg)}: ${error.message}`;
      }
      if (problem !== null) {
        warn(section, `C:${key}:${pair.key}`, `${key}: ${pair.label}`, problem);
        continue;
      }
      const ok = ratio >= pair.min;
      if (!ok) below += 1;
      add(
        section,
        `C:${key}:${pair.key}`,
        `${key}: ${pair.label} >= ${pair.min}:1`,
        ok ? "PASS" : "WARN",
        `${ratio.toFixed(2)}:1${ok ? "" : " BELOW MINIMUM"} (${pair.fg.replace("--dsw-alias-", "")} on ${pair.bg.replace("--dsw-alias-", "")})`,
      );
    }
    add(
      section,
      `C:${key}:summary`,
      `${key}: no semantic contrast pair below its minimum`,
      below === 0 ? "PASS" : "WARN",
      below === 0 ? `${CONTRAST_PAIRS.length} pairs ok` : `${below} pair(s) below minimum`,
    );
  }
}

/* ================================================================ section D */

const GATED_SELECTOR_RE =
  /^body\[data-dsh-futuristic-theme=(?:"([^"]+)"|'([^']+)')\]\[data-dsh-futuristic-effects=(?:"on"|'on')\]\s*(#dsh-ft-overlay(?:::before|::after)?)$/;
const OVERLAY_ONLY_RE = /^#dsh-ft-overlay(?:::before|::after)?$/;

function auditEffectsCss(state) {
  const section = "D. Effects CSS discipline";
  const effectsDir = join(state.pluginRoot, "src", "effects");
  const files = listFiles(effectsDir, ".css");
  if (files === null) {
    fail(section, "D1", "src/effects is readable", `${effectsDir} missing or unreadable`);
    return;
  }
  add(section, "D1", "src/effects is readable and contains stylesheets", files.length > 0 ? "PASS" : "FAIL", files.map((file) => basename(file)).join(", "));

  const knownIds = new Set(state.themes.records.map((record) => record.stem));
  const sheets = [];
  for (const file of files) {
    const stem = basename(file, ".css");
    const read = readTextFile(file);
    if (!read.ok) {
      fail(section, `D:${stem}:read`, `${basename(file)} is readable`, read.error);
      continue;
    }
    const rules = parseCssRules(stripCssComments(read.text));
    sheets.push({ file, stem, name: basename(file), text: read.text, rules });
  }
  const totalRules = sheets.reduce((sum, sheet) => sum + sheet.rules.length, 0);
  add(section, "D2", "effects stylesheets parse into rules", "PASS", `${sheets.length} sheet(s), ${totalRules} rule(s)`);

  let bareOverlaySelectors = [];
  let animationSelectors = [];
  let transitionSelectors = [];
  let filterSelectors = [];
  let externalUrls = [];

  for (const sheet of sheets) {
    if (sheet.stem === "base") {
      // Shared infrastructure sheet: it must still paint only the overlay, but
      // it is not required to be gated per theme (it can hold the shared
      // reduced-motion guard).
      const violations = [];
      for (const rule of sheet.rules) {
        for (const selector of splitTopLevel(rule.selector, ",")) {
          if (!OVERLAY_ONLY_RE.test(selector)) violations.push(selector);
        }
      }
      add(
        section,
        `D:${sheet.stem}:target`,
        "shared base effects sheet paints only #dsh-ft-overlay",
        violations.length === 0 ? "PASS" : "FAIL",
        violations.length === 0 ? `${sheet.rules.length} rule(s)` : `non-overlay selectors: ${violations.slice(0, 4).join(" | ")}`,
      );
      continue;
    }

    if (!knownIds.has(sheet.stem)) {
      warn(section, `D:${sheet.stem}:known`, `${sheet.name} belongs to a declared theme`, `no src/themes/${sheet.stem}.json`);
    }
    if (!CONTRACT_THEME_IDS.includes(sheet.stem)) {
      warn(section, `D:${sheet.stem}:contract`, `${sheet.name} matches a contract theme id`, `not one of ${CONTRACT_THEME_IDS.join(", ")}`);
    }

    const notGated = [];
    const badTarget = [];
    const wrongTheme = [];
    const hardDeclarations = [];
    const softDeclarations = [];

    for (const rule of sheet.rules) {
      for (const selector of splitTopLevel(rule.selector, ",")) {
        const overlayAt = selector.indexOf("#dsh-ft-overlay");
        if (overlayAt !== -1 && selector.slice(overlayAt) === "#dsh-ft-overlay") {
          // Painting the overlay element itself is tolerated but not the
          // documented surface (only its ::before / ::after are).
          bareOverlaySelectors.push(`${sheet.name}: ${selector}`);
        }
        const match = GATED_SELECTOR_RE.exec(selector);
        if (match) {
          const selectorTheme = match[1] ?? match[2];
          if (selectorTheme !== sheet.stem) wrongTheme.push(`${selector} (id ${selectorTheme})`);
          continue;
        }
        const hasOverlayTarget = /#dsh-ft-overlay(?![\w-])/.test(selector);
        if (!hasOverlayTarget) {
          badTarget.push(selector);
        } else {
          // Overlay is present but either the theme/effects gate is missing or
          // the target is not exactly the overlay's pseudo-elements.
          if (!/^body\[data-dsh-futuristic-theme=/.test(selector)) notGated.push(selector);
          else badTarget.push(selector);
        }
      }

      const declarations = rule.declarations;
      if (/(?<![-\w])position\s*:\s*fixed\b/i.test(declarations)) {
        const targets = splitTopLevel(rule.selector, ",").map((selector) => {
          const match = GATED_SELECTOR_RE.exec(selector);
          return match ? match[3] : null;
        });
        const onlyOverlayRule = targets.length === 1 && targets[0] === "#dsh-ft-overlay";
        if (!onlyOverlayRule) hardDeclarations.push(`position: fixed on ${shorten(rule.selector, 80)}`);
      }
      if (/(?<![-\w])pointer-events\s*:\s*auto\b/i.test(declarations)) {
        hardDeclarations.push(`pointer-events: auto on ${shorten(rule.selector, 80)}`);
      }
      if (/(?<![-\w])filter\s*:/i.test(declarations)) {
        softDeclarations.push(`filter on ${shorten(rule.selector, 80)} (contract: no page filters)`);
      }
      if (/!\s*important/i.test(declarations)) {
        softDeclarations.push(`!important on ${shorten(rule.selector, 80)}`);
      }
      if (/(?<![-\w])animation\s*:/i.test(declarations)) {
        animationSelectors.push(`${sheet.name}: ${rule.selector}`);
      }
      if (/(?<![-\w])transition\s*:/i.test(declarations)) {
        transitionSelectors.push(`${sheet.name}: ${rule.selector}`);
      }
      if (/(?<![-\w])filter\s*:/i.test(declarations)) filterSelectors.push(`${sheet.name}: ${rule.selector}`);
      if (/url\(\s*["']?(?:https?:)?\/\//i.test(declarations)) externalUrls.push(`${sheet.name}: ${rule.selector}`);
    }

    add(
      section,
      `D:${sheet.stem}:gated`,
      `${sheet.name}: selectors gated on theme + effects body attributes`,
      notGated.length === 0 ? "PASS" : "FAIL",
      notGated.length === 0 ? `${sheet.rules.length} rule(s) gated` : `not gated: ${notGated.slice(0, 4).join(" | ")}`,
    );
    add(
      section,
      `D:${sheet.stem}:target`,
      `${sheet.name}: selectors paint only #dsh-ft-overlay / ::before / ::after`,
      badTarget.length === 0 ? "PASS" : "FAIL",
      badTarget.length === 0 ? "overlay-only" : `bad targets: ${badTarget.slice(0, 4).join(" | ")}`,
    );
    add(
      section,
      `D:${sheet.stem}:theme-id`,
      `${sheet.name}: selectors use this sheet's own theme id`,
      wrongTheme.length === 0 ? "PASS" : "FAIL",
      wrongTheme.length === 0 ? sheet.stem : `cross-theme selectors: ${wrongTheme.slice(0, 4).join(" | ")}`,
    );
    add(
      section,
      `D:${sheet.stem}:declarations`,
      `${sheet.name}: no fixed positioning or pointer-events on painted layers`,
      hardDeclarations.length === 0 ? "PASS" : "FAIL",
      hardDeclarations.length === 0 ? "none" : hardDeclarations.slice(0, 4).join(" | "),
    );
    if (softDeclarations.length > 0) {
      warn(section, `D:${sheet.stem}:soft-declarations`, `${sheet.name}: declaration hygiene`, softDeclarations.slice(0, 4).join(" | "));
    } else {
      pass(section, `D:${sheet.stem}:soft-declarations`, `${sheet.name}: declaration hygiene`, "no !important / filter");
    }
    const ruleCount = sheet.rules.length;
    add(
      section,
      `D:${sheet.stem}:rules`,
      `${sheet.name}: paints at least one decorative rule`,
      ruleCount > 0 ? "PASS" : "WARN",
      `${ruleCount} rule(s)`,
    );
  }

  // Every contract theme should own an effects sheet.
  const missingEffects = CONTRACT_THEME_IDS.filter((id) => !files.some((file) => basename(file, ".css") === id));
  add(
    section,
    "D3",
    "each contract theme owns src/effects/<id>.css",
    missingEffects.length === 0 ? "PASS" : "WARN",
    missingEffects.length === 0 ? CONTRACT_THEME_IDS.join(", ") : `missing: ${missingEffects.join(", ")}`,
  );

  // Position fixed may only appear on the bare overlay rule (and none of the
  // per-theme selectors can satisfy that, so this is effectively a ban).
  // The per-sheet declaration check above already covers it.

  // Animation must be reduced-motion safe. The plugin's own src/base.css
  // installs a global guard for #dsh-ft-overlay pseudo-elements, so that counts
  // in addition to a sheet-local guard.
  const rowCss = readTextFile(join(state.pluginRoot, "src", "base.css"));
  const guardText = rowCss.ok ? rowCss.text : "";
  const globalGuard =
    /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/.test(guardText) &&
    /animation\s*:\s*none/i.test(guardText);
  const localGuard = sheets.some((sheet) => /prefers-reduced-motion/i.test(sheet.text) && /animation\s*:\s*none/i.test(sheet.text));
  const hasAnimation = animationSelectors.length > 0;
  add(
    section,
    "D4",
    "animations are guarded by prefers-reduced-motion",
    !hasAnimation || globalGuard || localGuard ? "PASS" : "FAIL",
    !hasAnimation
      ? "no animations in the effects layer"
      : `guard: ${globalGuard ? "src/base.css" : localGuard ? "effects sheet" : "MISSING"} — ${animationSelectors.slice(0, 3).join(" | ")}`,
  );
  if (transitionSelectors.length > 0) {
    info(section, "D5", "transitions in the decorative layer", transitionSelectors.slice(0, 4).join(" | "));
  }
  if (filterSelectors.length > 0) {
    warn(section, "D6", "no CSS filters on painted layers", filterSelectors.slice(0, 4).join(" | "));
  } else {
    pass(section, "D6", "no CSS filters on painted layers");
  }
  if (externalUrls.length > 0) {
    warn(section, "D7", "no external resources in the effects layer", externalUrls.slice(0, 4).join(" | "));
  } else {
    pass(section, "D7", "no external resources in the effects layer");
  }
  if (bareOverlaySelectors.length > 0) {
    warn(section, "D8", "effects paint pseudo-elements, not the overlay element itself", bareOverlaySelectors.slice(0, 4).join(" | "));
  }
}

/* ================================================================ section E */

function clientShape(record) {
  const theme = record.json;
  return {
    id: theme.id,
    colorScheme: theme.colorScheme,
    label: theme.label,
    description: theme.description,
    tagline: theme.tagline,
    accent: theme.accent ?? theme.roles?.primary,
    swatches: theme.swatches,
    preview: theme.preview ?? {},
    tokens: record.tokens,
  };
}

function diffClientThemes(expected, actual) {
  if (!Array.isArray(actual)) return "inlined THEMES is not an array";
  if (expected.length !== actual.length) return `bundle has ${actual.length} theme(s), sources build ${expected.length}`;
  for (let index = 0; index < expected.length; index += 1) {
    const want = expected[index];
    const got = actual[index];
    if (!got || typeof got !== "object") return `bundle theme #${index} is not an object`;
    for (const field of ["id", "colorScheme", "label", "description", "tagline", "accent", "swatches", "preview"]) {
      if (JSON.stringify(want[field]) !== JSON.stringify(got[field])) {
        return `theme "${want.id}" field "${field}" in lib/client.js differs from current sources — rebuild needed`;
      }
    }
    const wantTokens = want.tokens ?? {};
    const gotTokens = got.tokens && typeof got.tokens === "object" ? got.tokens : {};
    const wantNames = Object.keys(wantTokens);
    const gotNames = Object.keys(gotTokens);
    if (wantNames.length !== gotNames.length) {
      return `theme "${want.id}" token count differs (bundle ${gotNames.length}, sources build ${wantNames.length}) — rebuild needed`;
    }
    for (const name of wantNames) {
      if (!(name in gotTokens)) return `theme "${want.id}" is missing token ${name} in lib/client.js — rebuild needed`;
      if (gotTokens[name] !== wantTokens[name]) {
        return `theme "${want.id}" token ${name} differs (bundle "${gotTokens[name]}", sources build "${wantTokens[name]}") — rebuild needed`;
      }
    }
    for (const name of gotNames) {
      if (!(name in wantTokens)) return `theme "${want.id}" has unknown token ${name} in lib/client.js — rebuild needed`;
    }
  }
  return null;
}

function auditBundle(state) {
  const section = "E. Built bundle truth";
  const root = state.pluginRoot;
  const buildScript = join(root, "scripts", "build.mjs");
  const clientPath = join(root, "lib", "client.js");

  add(section, "E1", "scripts/build.mjs exists", existsSync(buildScript) ? "PASS" : "FAIL", buildScript);

  let buildOutput = "";
  let buildWarnings = [];
  if (existsSync(buildScript)) {
    const result = spawnSync(process.execPath, [buildScript, "--check"], {
      cwd: root,
      encoding: "utf8",
      timeout: 120000,
    });
    buildOutput = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    buildWarnings = buildOutput.split(/\r?\n/).filter((line) => /^warning:/i.test(line.trim())).map((line) => line.trim());
    if (result.error) {
      fail(section, "E2", "`scripts/build.mjs --check` exits 0", result.error.message);
    } else if (result.status !== 0) {
      const errorLines = buildOutput.split(/\r?\n/).filter((line) => /^error:/i.test(line.trim()));
      fail(section, "E2", "`scripts/build.mjs --check` exits 0", `exit ${result.status}: ${errorLines.slice(0, 4).join(" | ") || shorten(buildOutput, 400)}`);
    } else {
      const themesLine = buildOutput.split(/\r?\n/).find((line) => /^themes \(/.test(line.trim())) ?? "";
      pass(section, "E2", "`scripts/build.mjs --check` exits 0", `${themesLine.trim()}${buildWarnings.length ? `, ${buildWarnings.length} contrast warning(s)` : ""}`.trim());
    }
  } else {
    skip(section, "E2", "`scripts/build.mjs --check` exits 0", "build script missing");
  }
  if (buildWarnings.length > 0) {
    info(section, "E3", "build contrast warnings", buildWarnings.slice(0, 6).join(" | "));
  }

  const clientRead = readTextFile(clientPath);
  if (!clientRead.ok) {
    fail(section, "E4", "lib/client.js is readable", clientRead.error);
    return;
  }
  const bundle = clientRead.text;
  const pkgName = typeof state.pkg?.name === "string" ? state.pkg.name : "dsh-futuristic-themes";

  const loaderOk = bundle.includes("window.__ModuleLoader__.load") && new RegExp(`id\\s*:\\s*["']${escapeRe(pkgName)}["']`).test(bundle);
  add(section, "E4", "lib/client.js declares the ModuleLoader plugin with the package id", loaderOk ? "PASS" : "FAIL", loaderOk ? pkgName : "missing `window.__ModuleLoader__.load` or matching `id:`");

  const missingIds = CONTRACT_THEME_IDS.filter((id) => !bundle.includes(`"${id}"`));
  add(
    section,
    "E5",
    "lib/client.js inlines all three theme ids",
    missingIds.length === 0 ? "PASS" : "FAIL",
    missingIds.length === 0 ? CONTRACT_THEME_IDS.join(", ") : `missing: ${missingIds.join(", ")}`,
  );

  const objectObject = bundle.includes("[object Object]");
  add(section, "E6", "lib/client.js contains no [object Object] token values", objectObject ? "FAIL" : "PASS", objectObject ? "found literal [object Object] — a {light,dark} pair was inlined instead of a flat string" : "clean");

  const placeholders = bundle.match(/__[A-Z][A-Z0-9_]*__|@PLUGIN_ID@/g);
  add(
    section,
    "E7",
    "lib/client.js contains no unreplaced template placeholders",
    placeholders === null ? "PASS" : "FAIL",
    placeholders === null ? "none" : `found: ${[...new Set(placeholders)].join(", ")}`,
  );

  // Inlined THEMES payload.
  const themesExtract = extractJsonValueAfter(bundle, "var THEMES = ");
  if (themesExtract.error) {
    fail(section, "E8", "lib/client.js inlines an extractable THEMES payload", themesExtract.error);
  } else {
    pass(section, "E8", "lib/client.js inlines an extractable THEMES payload", `${Array.isArray(themesExtract.value) ? themesExtract.value.length : "?"} theme(s)`);
    const bundleIds = Array.isArray(themesExtract.value) ? themesExtract.value.map((theme) => theme?.id) : [];
    const missingBundleIds = CONTRACT_THEME_IDS.filter((id) => !bundleIds.includes(id));
    add(
      section,
      "E9",
      "inlined THEMES carries every contract theme",
      missingBundleIds.length === 0 ? "PASS" : "FAIL",
      missingBundleIds.length === 0 ? bundleIds.join(", ") : `missing: ${missingBundleIds.join(", ")} (got ${JSON.stringify(bundleIds)})`,
    );

    const eligible = state.themes.records.filter((record) => record.json !== null && record.tokens !== null && record.prepareErrors.length === 0);
    const expectedThemes = eligible.map(clientShape);
    const diff = diffClientThemes(expectedThemes, themesExtract.value);
    add(
      section,
      "E10",
      "inlined THEMES matches the current derived sources (fresh build)",
      diff === null ? "PASS" : "FAIL",
      diff === null ? `${expectedThemes.length} theme(s) in sync` : diff,
    );
  }

  // Inlined effects CSS must match src/effects/*.css concatenation (build order).
  const effectFiles = listFiles(join(root, "src", "effects"), ".css");
  const expectedEffects = effectFiles === null ? null : effectFiles.map((file) => readTextFile(file)).filter((read) => read.ok).map((read) => read.text).join("\n");
  const effectsExtract = extractJsonValueAfter(bundle, "var EFFECTS_CSS = ");
  if (effectsExtract.error) {
    fail(section, "E11", "lib/client.js inlines an extractable EFFECTS_CSS payload", effectsExtract.error);
  } else {
    pass(section, "E11", "lib/client.js inlines an extractable EFFECTS_CSS payload", `${String(effectsExtract.value).length} chars`);
    if (expectedEffects === null) {
      skip(section, "E12", "inlined EFFECTS_CSS matches src/effects (fresh build)", "src/effects unreadable");
    } else {
      const same = effectsExtract.value === expectedEffects;
      add(
        section,
        "E12",
        "inlined EFFECTS_CSS matches src/effects (fresh build)",
        same ? "PASS" : "FAIL",
        same ? `${expectedEffects.length} chars in sync` : `bundle ${String(effectsExtract.value).length} chars vs sources ${expectedEffects.length} chars — rebuild needed`,
      );
    }
  }

  // Inlined row/overlay CSS must match src/base.css + src/row.css.
  const baseRead = readTextFile(join(root, "src", "base.css"));
  const rowRead = readTextFile(join(root, "src", "row.css"));
  const rowExtract = extractJsonValueAfter(bundle, "var ROW_CSS = ");
  if (rowExtract.error) {
    fail(section, "E13", "lib/client.js inlines an extractable ROW_CSS payload", rowExtract.error);
  } else if (!baseRead.ok || !rowRead.ok) {
    fail(section, "E13", "lib/client.js inlines an extractable ROW_CSS payload", baseRead.error ?? rowRead.error);
  } else {
    const expectedRow = `${baseRead.text}\n${rowRead.text}`;
    const same = rowExtract.value === expectedRow;
    const overlayPresent = typeof rowExtract.value === "string" && rowExtract.value.includes("--dsh-font-family-text") && rowExtract.value.includes("#dsh-ft-overlay") && rowExtract.value.includes(".dshft-card");
    add(
      section,
      "E13",
      "inlined ROW_CSS matches src/base.css + src/row.css (fresh build)",
      same ? "PASS" : "FAIL",
      same ? `${expectedRow.length} chars in sync` : `bundle ${String(rowExtract.value).length} chars vs sources ${expectedRow.length} chars — rebuild needed`,
    );
    add(
      section,
      "E14",
      "inlined ROW_CSS contains the row, mono tokens and overlay base",
      overlayPresent ? "PASS" : "FAIL",
      overlayPresent ? "`.dshft-card`, `--dsh-font-family-*`, `#dsh-ft-overlay` present" : "one of `.dshft-card`, `--dsh-font-family-*`, `#dsh-ft-overlay` is missing",
    );
  }

  // build/themes.json (generated for previews; not shipped) freshness — warning only.
  const generatedRead = readJsonFile(join(root, "build", "themes.json"));
  if (!generatedRead.ok) {
    warn(section, "E15", "build/themes.json is fresh (preview data)", generatedRead.error);
  } else if (!Array.isArray(generatedRead.value)) {
    warn(section, "E15", "build/themes.json is fresh (preview data)", "not an array");
  } else {
    const byId = new Map(generatedRead.value.map((entry) => [entry?.id, entry]));
    const stale = [];
    for (const record of state.themes.records) {
      if (record.tokens === null) continue;
      const entry = byId.get(record.stem);
      if (!entry || JSON.stringify(entry.tokens) !== JSON.stringify(record.tokens)) stale.push(record.stem);
    }
    add(
      section,
      "E15",
      "build/themes.json is fresh (preview data)",
      stale.length === 0 ? "PASS" : "WARN",
      stale.length === 0 ? `${byId.size} theme(s)` : `rewrite with \`node scripts/build.mjs\` — stale: ${stale.join(", ")}`,
    );
  }

  // Cheap staleness hint: build artifact older than the newest source file.
  try {
    const clientMtime = statSync(clientPath).mtimeMs;
    const sourceFiles = [...(effectFiles ?? []), ...(state.themeFiles ?? []), join(root, "src", "base.css"), join(root, "src", "row.css"), join(root, "src", "client.template.js")];
    const newest = sourceFiles
      .map((file) => {
        try {
          return { file, mtime: statSync(file).mtimeMs };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.mtime - a.mtime)[0];
    if (newest && newest.mtime > clientMtime + 1000) {
      info(section, "E16", "lib/client.js is at least as new as every source file", `stale hint: ${basename(newest.file)} is newer than lib/client.js — run \`node scripts/build.mjs\``);
    } else {
      pass(section, "E16", "lib/client.js is at least as new as every source file");
    }
  } catch {
    skip(section, "E16", "lib/client.js is at least as new as every source file", "mtime unavailable");
  }
}

/* =================================================================== report */

function summarize(opts) {
  const counts = { total: checks.length, pass: 0, fail: 0, warn: 0, info: 0, skip: 0 };
  for (const check of checks) {
    if (check.status === "PASS") counts.pass += 1;
    else if (check.status === "FAIL") counts.fail += 1;
    else if (check.status === "WARN") counts.warn += 1;
    else if (check.status === "INFO") counts.info += 1;
    else counts.skip += 1;
  }
  const hardFailures = checks.filter((check) => check.status === "FAIL");
  const warnings = checks.filter((check) => check.status === "WARN");
  let exitCode = 0;
  if (hardFailures.length > 0) exitCode = 1;
  else if (opts.strict && warnings.length > 0) exitCode = 1;
  return { counts, hardFailures, warnings, exitCode };
}

function renderHuman(report) {
  const lines = [];
  lines.push("dsh-futuristic-themes — independent audit harness");
  lines.push(`version ${VERSION} · node ${report.node} · ${report.generatedAt}`);
  lines.push(`plugin: ${report.pluginRoot}`);
  if (report.fatal) lines.push(`fatal: ${report.fatal}`);
  lines.push("");

  const sections = new Map();
  for (const check of checks) {
    if (!sections.has(check.section)) sections.set(check.section, []);
    sections.get(check.section).push(check);
  }
  for (const [section, items] of sections) {
    const fails = items.filter((check) => check.status === "FAIL").length;
    const warns = items.filter((check) => check.status === "WARN").length;
    const badge = fails > 0 ? ` — ${fails} FAIL` : warns > 0 ? ` — ${warns} WARN` : "";
    lines.push(`${section} — ${items.length} check(s)${badge}`);
    for (const check of items) {
      if (report.options.quiet && check.status === "PASS") continue;
      if (report.options.quiet && check.status === "INFO") continue;
      const detail = check.detail === null ? "" : ` — ${shorten(check.detail, 700)}`;
      lines.push(`  ${check.status.padEnd(4)} ${check.id.padEnd(24)} ${check.title}${detail}`);
    }
    lines.push("");
  }

  const { counts } = report.summary;
  lines.push(
    `SUMMARY: ${counts.total} checks — ${counts.pass} PASS, ${counts.fail} FAIL (hard), ${counts.warn} WARN, ${counts.info} INFO, ${counts.skip} SKIP`,
  );
  if (report.summary.hardFailures.length > 0) {
    lines.push("");
    lines.push("HARD FAILURES");
    for (const check of report.summary.hardFailures) {
      lines.push(`  ${check.id} ${check.title}${check.detail ? ` — ${shorten(check.detail, 400)}` : ""}`);
    }
  }
  if (report.summary.warnings.length > 0) {
    lines.push("");
    lines.push("WARNINGS (not exit-code failures)");
    for (const check of report.summary.warnings) {
      lines.push(`  ${check.id} ${check.title}${check.detail ? ` — ${shorten(check.detail, 400)}` : ""}`);
    }
  }
  lines.push("");
  lines.push(`EXIT CODE: ${report.summary.exitCode}${report.summary.exitCode === 0 ? " (no hard failures)" : " (hard failure)"}`);
  if (report.reportPath) lines.push(`report JSON: ${report.reportPath}`);
  return `${lines.join("\n")}\n`;
}

/* -------------------------------------------------------------------- main */

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`audit-themes: ${error.message}`);
    process.exit(2);
  }
  if (opts.help) {
    console.log(HELP);
    process.exit(0);
  }

  const state = {
    pluginRoot: opts.pluginRoot,
    pkg: null,
    derive: null,
    deriveError: null,
    themes: { themeDir: null, files: null, records: [] },
    themeFiles: null,
  };

  // Load the plugin's authoring library (never duplicate its formulas).
  const derivePath = join(state.pluginRoot, "scripts", "lib", "derive.mjs");
  try {
    state.derive = await import(pathToFileURL(derivePath).href);
  } catch (error) {
    state.deriveError = `cannot import ${derivePath}: ${error.message}`;
  }

  const collected = collectThemes(state);
  state.themes = collected;
  state.themeFiles = collected.files;

  try {
    await auditPackageShape(state);
    auditThemeCompleteness(state);
    auditContrast(state);
    auditEffectsCss(state);
    auditBundle(state);
  } catch (error) {
    fail("Z. Harness", "Z1", "audit harness ran without an unexpected crash", `${error.message}${error.stack ? ` @@ ${error.stack.split("\n").slice(1, 4).join(" / ").trim()}` : ""}`);
  }

  const summary = summarize(opts);
  const generatedAt = new Date().toISOString();
  const report = {
    tool: "audit-themes",
    version: VERSION,
    sectionOrder: ["A. Package shape", "B. Theme completeness", "C. Contrast matrix", "D. Effects CSS discipline", "E. Built bundle truth", "Z. Harness"],
    generatedAt,
    node: nodeVersion(),
    pluginRoot: state.pluginRoot,
    options: { strict: opts.strict, quiet: opts.quiet },
    checks,
    summary: {
      counts: summary.counts,
      hardFailures: summary.hardFailures,
      warnings: summary.warnings,
      exitCode: summary.exitCode,
    },
    reportPath: null,
  };

  if (opts.writeReport) {
    try {
      const reportPath = opts.reportPath;
      mkdirSync(dirname(reportPath), { recursive: true });
      report.reportPath = reportPath;
      writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    } catch (error) {
      console.error(`audit-themes: cannot write report JSON: ${error.message}`);
    }
  }

  process.stdout.write(renderHuman(report));
  process.exitCode = summary.exitCode;
}

await main();
