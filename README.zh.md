# restart-service-button

一个 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) Web 插件：在 DSH 网页界面的**右上角**添加一个**一键重启服务**按钮，并提供一个设置页用于调整按钮位置。

因为是正式安装的 Web 插件（不是动态会话插件），按钮**能跨服务重启存活**——重启后按钮依然在，随时可以再次使用。

## 功能

- 🖱️ 一键重启 `dsh web` 后端：点一下进入「确认重启？」状态，再点一下确认；页面短暂断开后由后端自动重新拉起（约 3–5 秒）。
- ⚙️ 设置页（**设置 → 重启按钮**）：以像素调整按钮的 `top` / `right` 偏移，修改立即生效，并通过 `localStorage` 记住位置（重启后不丢）。
- 🎨 原生观感：使用 DSH 设计 token（`--dsw-alias-*`）、透明背景、轻量 hover。
- 🔒 重启接口仅允许本机回环访问，局域网暴露的 DSH web 无法被远程触发重启。

## 环境要求

- DSH web（`dsh web` 网页端），使用 **web profile**
- **Windows 为主力且经过充分测试的平台**；附带 POSIX（macOS/Linux）尽力而为的实现

## 安装

```bash
dsh plugin --profile web add github:<owner>/restart-service-button
```

或者从本地目录安装：

```bash
dsh plugin --profile web add link:C:/path/to/restart-service-button
```

然后**重启一次 web 服务**让插件加载：

```bash
dsh web
```

（如果之前装过动态版插件，可直接用当前界面上仍存在的按钮触发第一次重启。）

## 使用

1. 打开 DSH 网页界面。
2. 右上角：点击 **重启服务** → 按钮变红 **确认重启？**（5 秒无操作自动取消）→ 再点一次。
3. 服务重启；等页面恢复后刷新即可。按钮已持久安装，随时可用。

调整位置：**设置 → 重启按钮** → 修改 **距离顶部 (top)** / **距离右侧 (right)** → **恢复默认** 重置为 68 / 20。

## 工作原理

| 端 | 职责 |
| --- | --- |
| Host（`lib/index.js`） | 注册 `POST /api/restart-service-button/restart`（仅回环）。收到请求后启动**分离进程**（Windows 用 PowerShell `-EncodedCommand`，POSIX 用 `nohup bash`）：等待约 2 秒 → 强杀当前 `dsh web` node 进程（按命令行 `bin.js … web` 匹配）→ 重新拉起 `dsh web`，日志写入 `%TEMP%\dsh-web-restart-<时间戳>.log`（Windows）/ `/tmp/dsh-web-restart-<时间戳>.log`（POSIX）。 |
| Client（`lib/client.js`） | 在 `shell.overlay` 槽位注册按钮、在 `settings.section` 注册位置页；确认后向路由发 POST；位置存 `localStorage`。 |

## 注意事项

- 重启会杀掉当前 DSH 进程，正在进行的任务会被中断（会话已持久化，可恢复）。
- 按钮位置按浏览器存于 `localStorage`（origin 级）；清浏览器数据会回到默认 68 / 20。
- POSIX 重启路径为尽力而为，测试充分度不如 Windows。

## 卸载

```bash
dsh plugin --profile web remove restart-service-button
```

然后重启 `dsh web`。

## 许可证

[MIT](./LICENSE)
