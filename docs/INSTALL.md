# Installing `dsh-futuristic-themes` into DeepSeek Harness

The canonical source is the plugin's GitHub repository:
**https://github.com/ihodorchenko/dsh-futuristic-themes** — the package lives in the
`dsh-futuristic-themes/` subdirectory, so pnpm installs it with a subdirectory spec
(`#path:/dsh-futuristic-themes`). Each install pins an exact commit; updates re-resolve
the HEAD of `main`.

## Desktop (recommended: the helper script)

The Desktop profile (`$DSH_HOME/profiles/desktop`) is owned by the Electron app, so the
`dsh plugin` CLI refuses it on purpose (`profile "desktop" is managed exclusively by the
Electron application`). Use the repository script, which performs the documented manual
profile edit, backs up the profile, installs from GitHub with the pnpm that ships with the
app, and waits for the running app's HMR to mount the plugin:

```sh
git clone https://github.com/ihodorchenko/dsh-futuristic-themes.git
cd dsh-futuristic-themes
tools/install-desktop.sh              # install from GitHub
tools/install-desktop.sh --update     # update to the latest GitHub commit
tools/install-desktop.sh --uninstall  # remove
```

For plugin development, `tools/install-desktop.sh --local` symlinks the working copy instead
(the old `link:` install); rebuild `lib/client.js` and reload the window after changes.

Open **Settings → General → Futuristic themes**. If the row does not appear, reload the app
window (⌘R) or restart the app once; the profile change is durable either way.

### In-app plugin manager

1. Open **Settings → Plugins**.
2. Add a plugin with the repository URL or the package spec
   `github:ihodorchenko/dsh-futuristic-themes#path:/dsh-futuristic-themes`
   (a packed tarball of the `dsh-futuristic-themes/` folder also works).
3. Confirm, wait for the install, and restart the app if the UI reports a pending restart.

## `dsh web` / CLI profiles

```sh
dsh plugin --profile web add "github:ihodorchenko/dsh-futuristic-themes#path:/dsh-futuristic-themes"
# then restart the profile
```

Or, from a local checkout: `dsh plugin --profile web add /absolute/path/to/dsh-futuristic-themes`.

## Manual profile edit (equivalent to the script)

The plugin's own `cordis.patch.yml` bundle layer adds the loader entry, so no patch row has
to be written by hand.

```sh
# 1. back up the profile first (cheap insurance)
cp ~/.dsh/profiles/desktop/package.json ~/.dsh/profiles/desktop/package.json.bak
cp ~/.dsh/profiles/desktop/pnpm-lock.yaml ~/.dsh/profiles/desktop/pnpm-lock.yaml.bak
```

Edit `~/.dsh/profiles/desktop/package.json`:

```jsonc
{
  "dependencies": {
    // ... keep existing ones ...
    "dsh-futuristic-themes": "github:ihodorchenko/dsh-futuristic-themes#path:/dsh-futuristic-themes"
  },
  "dsh": {
    "profile": {
      "bundles": [
        // ... keep existing ones ...
        "dsh-futuristic-themes"
      ]
    }
  }
}
```

Then install with the pnpm that ships with the app:

```sh
cd ~/.dsh/profiles/desktop
NODE="$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node"
PNPM="$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/pnpm/bin/pnpm.cjs"
"$NODE" "$PNPM" install
# update later:
"$NODE" "$PNPM" update dsh-futuristic-themes
```

Verify the installed source and the live module graph from a shell:

```sh
grep -A2 "dsh-futuristic-themes" ~/.dsh/profiles/desktop/pnpm-lock.yaml | head -4
# expected: version: https://codeload.github.com/ihodorchenko/dsh-futuristic-themes/tar.gz/<commit>#path:/dsh-futuristic-themes

timeout 4 curl -sS -N http://127.0.0.1:50818/plugins/events \
  | grep -o '"id":"dsh-futuristic-themes"' | head -1
# expected: "id":"dsh-futuristic-themes"
```

With HMR enabled (the `dsh-base` bundle ships it), the running app recomposes the profile
within a second or two and the renderer loads the plugin live.

## Updating a GitHub install

1. `tools/install-desktop.sh --update` (or `pnpm update dsh-futuristic-themes` in the profile).
2. Restart DeepSeek Harness to be sure the new build is live. The client module registry may
   keep serving its cached bundle revision after a dependency update (identical content keeps
   the same revision by design), so a window reload is not guaranteed to pick up a GitHub
   update; the profile change itself is durable and is applied on the next app start. The
   current running session keeps working throughout.

## Rollback

1. `tools/install-desktop.sh --uninstall`, or restore the profile backups by hand.
2. Reload the app window / restart once; HMR removes the plugin and its styles.
3. To go back to a specific older commit, set the dependency spec to
   `github:ihodorchenko/dsh-futuristic-themes#<commit>#path:/dsh-futuristic-themes` and reinstall.

If the app refuses to start after a bad edit, the Desktop boot guard offers **Disable
third-party plugins**; it rewrites `cordis.patch.yml` to a safe state and lets you back in.
Crash details live in `~/Library/Logs/DeepSeek Harness/crash-*-web-boot.log`.
