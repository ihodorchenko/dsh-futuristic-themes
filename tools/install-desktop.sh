#!/usr/bin/env bash
# Install / update / uninstall dsh-futuristic-themes in the DeepSeek Harness Desktop profile.
#
# Canonical source is this plugin's GitHub repository (pinned per commit):
#   github:ihodorchenko/dsh-futuristic-themes#path:/dsh-futuristic-themes
# For plugin development you can link the local working copy instead (--local).
#
# Desktop's profile is owned by the Electron app, so `dsh plugin --profile desktop`
# is refused by design. This script performs the documented manual profile edit:
# add the package to the profile manifest + bundle stack, install it with the pnpm
# that ships with the app, then wait for the running app's HMR to publish the new
# client module graph.
#
# Usage:
#   tools/install-desktop.sh                # install from GitHub (HEAD of main)
#   tools/install-desktop.sh --update       # update an existing GitHub install to HEAD
#   tools/install-desktop.sh --local        # link the local working copy (development)
#   tools/install-desktop.sh --from <spec>  # use an explicit pnpm spec
#   tools/install-desktop.sh --uninstall    # remove the plugin again
#
# It never restarts the app: HMR recomposes the profile. If the row does not
# appear, reload the app window (Cmd+R).
set -euo pipefail

PLUGIN_NAME="dsh-futuristic-themes"
GITHUB_SPEC="github:ihodorchenko/dsh-futuristic-themes#path:/dsh-futuristic-themes"
WORKSPACE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR="$WORKSPACE/dsh-futuristic-themes"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE_DIR="$DSH_HOME/profiles/desktop"
MANIFEST="$PROFILE_DIR/package.json"
NODE="$DSH_HOME/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node"
PNPM="$DSH_HOME/dsh-runtimes/dsh-primary-runtime/dependencies/pnpm/bin/pnpm.cjs"
MODE="install"
SPEC="$GITHUB_SPEC"
FORCE_UPDATE="no"

fail() { printf 'error: %s\n' "$*" >&2; exit 1; }
info() { printf '· %s\n' "$*"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --uninstall) MODE="uninstall"; shift ;;
    --update) FORCE_UPDATE="yes"; shift ;;
    --local) SPEC="link:$PLUGIN_DIR"; shift ;;
    --from) [[ $# -ge 2 ]] || fail "--from needs a pnpm spec"; SPEC="$2"; shift 2 ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) fail "unknown argument: $1 (see --help)" ;;
  esac
done

[[ -d "$PROFILE_DIR" ]] || fail "desktop profile not found at $PROFILE_DIR (is DeepSeek Harness Desktop installed for this user?)"
[[ -x "$NODE" ]] || fail "bundled node not found at $NODE"
[[ -f "$PNPM" ]] || fail "bundled pnpm not found at $PNPM"
if [[ "$SPEC" == link:* ]]; then
  [[ -f "${SPEC#link:}/lib/client.js" ]] || fail "local build missing: ${SPEC#link:}/lib/client.js (run scripts/build.mjs in the plugin)"
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
cp "$MANIFEST" "$MANIFEST.bak-$STAMP"
[[ -f "$PROFILE_DIR/cordis.patch.yml" ]] && cp "$PROFILE_DIR/cordis.patch.yml" "$PROFILE_DIR/cordis.patch.yml.bak-$STAMP"
[[ -f "$PROFILE_DIR/pnpm-lock.yaml" ]] && cp "$PROFILE_DIR/pnpm-lock.yaml" "$PROFILE_DIR/pnpm-lock.yaml.bak-$STAMP"
info "backed up profile to *.bak-$STAMP"

"$NODE" - "$MANIFEST" "$PLUGIN_NAME" "$SPEC" "$MODE" <<'NODE'
const fs = require("node:fs");
const [manifestPath, name, spec, mode] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.dependencies ??= {};
manifest.dsh ??= {};
manifest.dsh.profile ??= {};
manifest.dsh.profile.bundles ??= [];
if (mode === "install") {
  manifest.dependencies[name] = spec;
  if (!manifest.dsh.profile.bundles.includes(name)) manifest.dsh.profile.bundles.push(name);
} else {
  delete manifest.dependencies[name];
  manifest.dsh.profile.bundles = manifest.dsh.profile.bundles.filter((row) => row !== name);
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
NODE
info "$MODE: manifest updated ($SPEC)"

if [[ "$MODE" == "uninstall" ]]; then
  ( cd "$PROFILE_DIR" && "$NODE" "$PNPM" install --reporter=append-only )
  info "profile packages updated"
else
  if [[ "$FORCE_UPDATE" == "yes" ]]; then
    # A git dependency stays pinned until it is re-resolved explicitly.
    ( cd "$PROFILE_DIR" && "$NODE" "$PNPM" install --reporter=append-only && "$NODE" "$PNPM" update "$PLUGIN_NAME" --reporter=append-only )
  else
    ( cd "$PROFILE_DIR" && "$NODE" "$PNPM" install --reporter=append-only )
  fi
  info "profile packages installed"
  if grep -q "codeload.github.com" "$PROFILE_DIR/pnpm-lock.yaml" 2>/dev/null; then
    commit="$(grep -o "tar.gz/[0-9a-f]\{40\}" "$PROFILE_DIR/pnpm-lock.yaml" 2>/dev/null | head -1 | cut -d/ -f2 || true)"
    [[ -n "${commit:-}" ]] && info "installed from GitHub commit ${commit:0:12}"
  fi
fi

# HMR publishes the new client graph through the desktop host's SSE stream.
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

Source: $SPEC
Rollback files (keep until you are happy):
  $MANIFEST.bak-$STAMP
  $PROFILE_DIR/cordis.patch.yml.bak-$STAMP   (if it existed)
  $PROFILE_DIR/pnpm-lock.yaml.bak-$STAMP     (if it existed)

Updating later:  tools/install-desktop.sh --update   (re-resolves GitHub HEAD)
Local dev:       tools/install-desktop.sh --local    (symlinks the working copy)

If the app fails to start: the Desktop boot guard offers "Disable third-party
plugins"; crash logs are in ~/Library/Logs/DeepSeek Harness/.
EOF
