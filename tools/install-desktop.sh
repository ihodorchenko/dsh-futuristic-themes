#!/usr/bin/env bash
# Install dsh-futuristic-themes into a DeepSeek Harness Desktop profile.
#
# Desktop's profile is owned by the Electron app, so `dsh plugin --profile desktop`
# is refused by design. This script performs the documented manual profile edit:
# add the linked package to the profile manifest + bundle stack, install it with
# the pnpm that ships with the app, then wait for the running app's HMR to
# publish the new client module graph.
#
# Usage:
#   tools/install-desktop.sh                 # uses $DSH_HOME or ~/.dsh
#   DSH_HOME=/path/to/home tools/install-desktop.sh
#   tools/install-desktop.sh --uninstall     # remove the plugin again
#
# It never restarts the app: HMR recomposes the profile. If the row does not
# appear, reload the app window (Cmd+R).
set -euo pipefail

PLUGIN_NAME="dsh-futuristic-themes"
WORKSPACE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR="$WORKSPACE/dsh-futuristic-themes"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE_DIR="$DSH_HOME/profiles/desktop"
MANIFEST="$PROFILE_DIR/package.json"
NODE="$DSH_HOME/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node"
PNPM="$DSH_HOME/dsh-runtimes/dsh-primary-runtime/dependencies/pnpm/bin/pnpm.cjs"
MODE="install"
[[ "${1:-}" == "--uninstall" ]] && MODE="uninstall"

fail() { printf 'error: %s\n' "$*" >&2; exit 1; }
info() { printf '· %s\n' "$*"; }

[[ -d "$PROFILE_DIR" ]] || fail "desktop profile not found at $PROFILE_DIR (is DeepSeek Harness Desktop installed for this user?)"
[[ -f "$PLUGIN_DIR/lib/client.js" ]] || fail "built client bundle missing: $PLUGIN_DIR/lib/client.js (run scripts/build.mjs in the plugin)"
[[ -x "$NODE" ]] || fail "bundled node not found at $NODE"
[[ -f "$PNPM" ]] || fail "bundled pnpm not found at $PNPM"

STAMP="$(date +%Y%m%d-%H%M%S)"
cp "$MANIFEST" "$MANIFEST.bak-$STAMP"
[[ -f "$PROFILE_DIR/cordis.patch.yml" ]] && cp "$PROFILE_DIR/cordis.patch.yml" "$PROFILE_DIR/cordis.patch.yml.bak-$STAMP"
info "backed up manifest to package.json.bak-$STAMP"

"$NODE" - "$MANIFEST" "$PLUGIN_NAME" "$PLUGIN_DIR" "$MODE" <<'NODE'
const fs = require("node:fs");
const [manifestPath, name, pluginDir, mode] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.dependencies ??= {};
manifest.dsh ??= {};
manifest.dsh.profile ??= {};
manifest.dsh.profile.bundles ??= [];
if (mode === "install") {
  manifest.dependencies[name] = `link:${pluginDir}`;
  if (!manifest.dsh.profile.bundles.includes(name)) manifest.dsh.profile.bundles.push(name);
} else {
  delete manifest.dependencies[name];
  manifest.dsh.profile.bundles = manifest.dsh.profile.bundles.filter((row) => row !== name);
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
NODE
info "$MODE: manifest updated (dependency + bundle layer)"

( cd "$PROFILE_DIR" && "$NODE" "$PNPM" install --silent )
info "profile packages installed"

# HMR publishes the new client graph through the desktop host's SSE stream.
# Poll it briefly; a 200 response with the plugin id means the app picked it up.
APP_URL="${DSH_WEB_URL:-http://127.0.0.1:50818}"
if [[ "$MODE" == "install" ]]; then
  found=""
  for _ in $(seq 1 20); do
    if timeout 2 curl -sS -N "$APP_URL/plugins/events" 2>/dev/null | grep -q "\"id\":\"$PLUGIN_NAME\""; then
      found="yes"; break
    fi
    sleep 0.5
  done
  if [[ -n "$found" ]]; then
    info "plugin is live in the running app — open Settings → General → Futuristic themes"
  else
    info "installed, but HMR has not published the plugin yet."
    info "Reload the app window (Cmd+R) or restart DeepSeek Harness, then check Settings → General."
  fi
else
  info "uninstalled — reload the app window (Cmd+R) to drop the plugin's styles."
fi

cat <<EOF

Rollback files (keep until you are happy):
  $MANIFEST.bak-$STAMP
  $PROFILE_DIR/cordis.patch.yml.bak-$STAMP   (if it existed)

If the app fails to start: the Desktop boot guard offers "Disable third-party
plugins"; crash logs are in ~/Library/Logs/DeepSeek Harness/.
EOF
