# restart-service-button

A [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) web plugin that adds a **one-click restart-service button** to the top-right corner of the DSH web GUI, plus a settings page to reposition it.

Because it is a real installed web plugin (not a dynamic session plugin), the button **survives service restarts** — after a restart the button is still there and ready to use again.

## Features

- 🖱️ One-click restart of the `dsh web` backend: click once to arm ("确认重启？"), click again to confirm; the button shows "重启中…" then "请刷新页面" (please refresh) after ~2 s.
- ⚙️ Settings page (**Settings → 重启按钮**) to adjust the button's `top` / `right` offset in pixels; changes apply immediately and are remembered in `localStorage` across restarts.
- 🎨 Native look: styled with DSH design tokens (`--dsw-alias-*`), transparent background, subtle hover.
- 🔒 Restart endpoint is loopback-only, so a LAN-exposed DSH web cannot be restarted remotely.

## Requirements

- DSH web (the `dsh web` GUI) with the **web profile**
- Windows is the primary, battle-tested platform; a best-effort POSIX (macOS/Linux) path is included

## Install

```bash
dsh plugin --profile web add github:<owner>/restart-service-button
```

Or from a local checkout:

```bash
dsh plugin --profile web add link:C:/path/to/restart-service-button
```

Then **restart the web service** once so the plugin loads:

```bash
dsh web
```

(The first restart can be triggered from the still-running GUI if a previous dynamic plugin is active.)

## Usage

1. Open the DSH web GUI.
2. Top-right corner: click **重启服务** → the button turns red **确认重启？** (auto-cancels after 5 s) → click again.
3. The service restarts; the button changes to "请刷新页面" after ~2 s. Refresh the page once the service is back. The button remains installed and ready.

To reposition the button: **Settings → 重启按钮** → change **距离顶部 (top)** / **距离右侧 (right)** → **恢复默认** resets to 80 / 20.

## How it works

| Side | What it does |
| --- | --- |
| Host (`lib/index.js`) | Registers `POST /api/restart-service-button/restart` (loopback-only). On request it spawns a **detached** process (Windows PowerShell `-EncodedCommand`, POSIX `nohup bash`) that waits ~2 s, force-kills the current `dsh web` node process (matched by command line `bin.js … web`), then relaunches `dsh web` and logs to `%TEMP%\dsh-web-restart-<timestamp>.log` (Windows) or `/tmp/dsh-web-restart-<timestamp>.log` (POSIX). |
| Client (`lib/client.js`) | Registers the button in the `shell.overlay` slot and the position page in `settings.section`; posts to the route on confirm; keeps the position in `localStorage`. |

## Notes & limitations

- Restarting kills the running DSH process — any in-flight work is interrupted (sessions are persisted and recoverable).
- Button position is stored per-browser in `localStorage` (origin-scoped); clearing browser data resets it to the default 80 / 20.
- The POSIX restart path is best-effort and not as thoroughly tested as Windows.

## Uninstall

```bash
dsh plugin --profile web remove restart-service-button
```

Then restart `dsh web`.

## License

[MIT](./LICENSE)
