/**
 * restart-service-button — host half.
 *
 * Registers the /api/dsh-restart/restart route. A browser POST to it triggers
 * a self-restart of the `dsh web` backend: a detached process kills the
 * current `dsh web` node process and relaunches it (mirroring the original
 * `cmd /c dsh web` / `dsh web` launch), so the button survives the restart
 * it causes.
 *
 * Windows is the primary, battle-tested platform (PowerShell detach). A
 * best-effort POSIX (bash + nohup) path is provided for macOS/Linux.
 */

const RESTART_PATH = '/api/restart-service-button/restart'

/** Only the loopback browser may trigger a restart (LAN safety fence). */
function isLoopback(req) {
  const addr = req.socket && req.socket.remoteAddress
  if (!addr) return false
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1'
}

/**
 * Build the detached restart launcher for the current platform.
 * @returns a single shell command that schedules the restart in a detached
 * process and returns immediately.
 */
function buildLaunch() {
  const isWin = typeof process !== 'undefined' && process.platform === 'win32'

  if (isWin) {
    // Detached PowerShell script that performs the actual restart.
    const restartScript = [
      "$ErrorActionPreference = 'SilentlyContinue'",
      'Start-Sleep -Seconds 2',
      "$procs = Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Where-Object { $_.CommandLine -like '*bin.js* web' }",
      'foreach ($p in $procs) { Stop-Process -Id $p.ProcessId -Force }',
      'Start-Sleep -Seconds 2',
      "$log = Join-Path $env:TEMP ('dsh-web-restart-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')",
      "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','dsh web' -RedirectStandardOutput $log -RedirectStandardError ($log + '.err') -WindowStyle Hidden"
    ].join('\n')
    const encoded = Buffer.from(restartScript, 'utf8').toString('base64')
    // Decode the script, re-encode as UTF-16LE base64 for
    // powershell -EncodedCommand, then start it detached and hidden.
    return [
      "$ErrorActionPreference = 'SilentlyContinue'",
      "$s = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + encoded + "'))",
      '$enc = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($s))',
      "Start-Process -FilePath 'C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-EncodedCommand',$enc -WindowStyle Hidden"
    ].join('\n')
  }

  // POSIX: detached bash via nohup (best-effort; not as battle-tested as the
  // Windows path). The script is base64-encoded to avoid quoting pitfalls.
  const restartScript = [
    'sleep 2',
    'for pid in $(pgrep -f "lib/bin\\.js web" || true); do kill -9 "$pid" 2>/dev/null || true; done',
    'sleep 2',
    'nohup dsh web > /tmp/dsh-web-restart-$(date +%Y%m%d-%H%M%S).log 2>&1 &'
  ].join('\n')
  const encoded = Buffer.from(restartScript, 'utf8').toString('base64')
  return "nohup bash -c 'echo " + encoded + " | base64 -d | bash' >/dev/null 2>&1 &"
}

/** Stable cordis plugin name. */
export const name = 'restart-service-button'

/** Services required before the restart route can mount. */
export const inject = ['webServer', 'shell']

export function apply(ctx) {
  const launch = buildLaunch()

  const writeJson = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(body))
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: RESTART_PATH,
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        writeJson(res, 405, { ok: false, message: 'method not allowed' })
        return
      }
      if (!isLoopback(req)) {
        writeJson(res, 403, { ok: false, message: 'forbidden: loopback only' })
        return
      }
      try {
        const result = await ctx.shell.run(ctx.shell.resolve({ command: launch, timeoutMs: 20000 }))
        const ok = result.exitCode === 0 && result.timedOut === false && result.aborted === false
        writeJson(res, ok ? 200 : 500, {
          ok,
          message: ok
            ? 'restart scheduled'
            : 'restart trigger failed: ' + (result.stderr && result.stderr.text ? result.stderr.text.slice(-300) : 'unknown error'),
        })
      } catch (err) {
        writeJson(res, 500, { ok: false, message: 'error: ' + (err && err.message ? err.message : String(err)) })
      }
    },
  }), 'restart-service-button: route')
}
