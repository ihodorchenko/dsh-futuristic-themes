# Installing `dsh-futuristic-themes` into DeepSeek Harness Desktop

The Desktop profile (`$DSH_HOME/profiles/desktop`) is owned by the Electron app, so the
`dsh plugin` CLI refuses it on purpose (`profile "desktop" is managed exclusively by the
Electron application`). Two supported ways exist: the in-app plugin manager, or the manual
profile edit below (the same mechanism every community plugin uses).

## Option A — in-app plugin manager (recommended)

1. Open **Settings → Plugins**.
2. Add a plugin and point it at either:
   - the folder `/Users/<you>/Project/Themes/dsh-futuristic-themes`, or
   - a tarball made with `pnpm pack` / `npm pack` inside that folder.
3. Confirm, wait for the install, and restart the app if the UI reports a pending restart.
4. Open **Settings → General** — the **Futuristic themes** row is at the bottom.

## Option B — manual profile edit

Only the profile manifest and one install are needed; the plugin's own `cordis.patch.yml`
bundle layer adds the loader entry, so no patch row has to be written by hand.

```sh
# 1. back up the profile first (cheap insurance)
cp ~/.dsh/profiles/desktop/package.json ~/.dsh/profiles/desktop/package.json.bak
cp ~/.dsh/profiles/desktop/cordis.patch.yml ~/.dsh/profiles/desktop/cordis.patch.yml.bak
```

Edit `~/.dsh/profiles/desktop/package.json`:

```jsonc
{
  "dependencies": {
    // ... keep existing ones ...
    "dsh-futuristic-themes": "link:/Users/<you>/Project/Themes/dsh-futuristic-themes"
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

Then install the linked package into the profile with the pnpm that ships with the app:

```sh
cd ~/.dsh/profiles/desktop
NODE="$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node"
PNPM="$HOME/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/pnpm/bin/pnpm.cjs"
"$NODE" "$PNPM" install
```

With HMR enabled (the `dsh-base` bundle ships it), the running app recomposes the profile
within a second or two: the plugin appears in the client module graph and the renderer loads
it live. If the row does not appear, reload the app window (⌘R) or restart the app once; the
profile change is durable either way.

Verify from a shell without touching the GUI:

```sh
# the live client module graph of the running app must list the plugin
timeout 4 curl -sS -N http://127.0.0.1:50818/plugins/events \
  | grep -o '"id":"dsh-futuristic-themes"' | head -1
```

Expected: `"id":"dsh-futuristic-themes"`.

## Rollback

1. Restore the two backup files, or remove the dependency + bundle row by hand.
2. Run the pnpm install above again so `node_modules` drops the link.
3. Reload the app window / restart once. HMR removes the plugin and its styles.

If the app refuses to start after a bad edit, the Desktop boot guard offers **Disable
third-party plugins**; it rewrites `cordis.patch.yml` to a safe state and lets you back in.
Crash details live in `~/Library/Logs/DeepSeek Harness/crash-*-web-boot.log`.

## Why the theme id is not written into `ui-theme.preference`

The host settings schema accepts only `light`, `dark` and `system`. Writing a third-party
theme id there makes `ThemeRuntime.buildSnapshot()` throw on the next boot
(`theme registry lost "<id>"`) because the plugin that registers the id loads later than the
preference. The plugin therefore keeps its selection in `localStorage` and re-applies it after
the settings document arrives; see the main README.
