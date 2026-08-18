window.__ModuleLoader__.load({
  id: "restart-service-button",
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" })
    let React = require("react")

    const RESTART_PATH = "/api/restart-service-button/restart"
    const TAG_ID = "restart-service-button/style"

    const CSS =
      '.restart-service-button{position:fixed;z-index:50;pointer-events:auto;display:inline-flex;align-items:center;justify-content:center;gap:4px;height:36px;padding:0 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:18px;background:transparent;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px;cursor:pointer;transition:background .15s ease}' +
      '.restart-service-button:hover{background:var(--dsw-alias-interactive-bg-hover)}' +
      '.restart-service-button.confirm{background:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-label-primary-foreground)}' +
      '.restart-service-button.confirm:hover{background:var(--dsw-static-red-600)}' +
      '.restart-service-button.busy{opacity:.4;cursor:not-allowed;pointer-events:none}' +
      '.restart-service-settings{display:flex;flex-direction:column;gap:16px;padding:8px 0}' +
      '.restart-service-settings h3{margin:0;font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary)}' +
      '.restart-service-settings p{margin:0;font-size:13px;color:var(--dsw-alias-label-secondary);line-height:20px}' +
      '.restart-service-field{display:flex;flex-direction:column;gap:6px}' +
      '.restart-service-field span{font-size:13px;color:var(--dsw-alias-label-secondary)}' +
      '.restart-service-field input{width:120px;height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:14px;outline:none}' +
      '.restart-service-field input:focus{border-color:var(--dsw-alias-brand-primary)}' +
      '.restart-service-reset{align-self:flex-start;height:32px;padding:0 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;background:transparent;color:var(--dsw-alias-label-primary);font-size:14px;cursor:pointer}' +
      '.restart-service-reset:hover{background:var(--dsw-alias-interactive-bg-hover)}'

    if (typeof document !== "undefined" && document.querySelector('style[data-plugin-css="' + TAG_ID + '"]') === null) {
      const tag = document.createElement("style")
      tag.dataset.plugin = "restart-service-button"
      tag.dataset.pluginCss = TAG_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    // Position store backed by localStorage so the chosen position survives
    // service restarts (same origin: http://127.0.0.1:<port>).
    const DEFAULT_TOP = 80
    const DEFAULT_RIGHT = 20
    const POSITION_KEY = "restart-service-button.position"

    function loadPosition() {
      try {
        const raw = window.localStorage.getItem(POSITION_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed.top === "number" && typeof parsed.right === "number") {
            return { top: parsed.top, right: parsed.right }
          }
        }
      } catch (e) { /* localStorage unavailable — fall back to defaults */ }
      return { top: DEFAULT_TOP, right: DEFAULT_RIGHT }
    }

    function savePosition(top, right) {
      try {
        window.localStorage.setItem(POSITION_KEY, JSON.stringify({ top: top, right: right }))
      } catch (e) { /* ignore persistence failure */ }
    }

    const initial = loadPosition()
    const posStore = { top: initial.top, right: initial.right, listeners: [] }
    function setPosition(top, right) {
      posStore.top = top
      posStore.right = right
      savePosition(top, right)
      posStore.listeners.forEach((l) => l())
    }
    function subscribePosition(l) {
      posStore.listeners.push(l)
      return () => {
        const i = posStore.listeners.indexOf(l)
        if (i >= 0) posStore.listeners.splice(i, 1)
      }
    }

    function RestartButton() {
      const [state, setState] = React.useState("idle")
      const [error, setError] = React.useState("")
      const [top, setTop] = React.useState(posStore.top)
      const [right, setRight] = React.useState(posStore.right)

      React.useEffect(() => subscribePosition(() => {
        setTop(posStore.top)
        setRight(posStore.right)
      }), [])

      React.useEffect(() => {
        if (state === "confirm") {
          const t = setTimeout(() => setState("idle"), 5000)
          return () => clearTimeout(t)
        }
        if (state === "busy") {
          const t = setTimeout(() => setState("refresh"), 2000)
          return () => clearTimeout(t)
        }
      }, [state])

      const onClick = () => {
        if (state === "idle") {
          setError("")
          setState("confirm")
        } else if (state === "confirm") {
          setState("busy")
          setError("")
          fetch(RESTART_PATH, { method: "POST" })
            .then((res) => res.json().catch(() => ({ ok: false, message: "HTTP " + res.status })))
            .then((body) => {
              if (body && body.ok === false) {
                setState("idle")
                setError(body.message || "触发失败")
              }
            })
            .catch((err) => {
              setState("idle")
              setError(String(err && err.message ? err.message : err))
            })
        } else if (state === "refresh") {
          window.location.reload()
        }
      }

      const text = state === "idle" ? "重启服务"
        : state === "confirm" ? "确认重启？"
        : state === "busy" ? "重启中…"
        : "请刷新页面"
      const title = error ? error : (state === "refresh" ? "点击刷新页面" : "一键重启 DSH 后端服务（dsh web）")

      return React.createElement("button", {
        type: "button",
        className: "restart-service-button " + (state === "idle" ? "" : state),
        style: { top: top + "px", right: right + "px" },
        onClick: onClick,
        title: title,
        "aria-label": text,
      }, text)
    }

    function PositionSettings() {
      const [top, setTop] = React.useState(posStore.top)
      const [right, setRight] = React.useState(posStore.right)

      React.useEffect(() => subscribePosition(() => {
        setTop(posStore.top)
        setRight(posStore.right)
      }), [])

      const onTop = (e) => {
        const v = parseInt(e.target.value, 10)
        setPosition(Number.isFinite(v) ? v : posStore.top, posStore.right)
      }
      const onRight = (e) => {
        const v = parseInt(e.target.value, 10)
        setPosition(posStore.top, Number.isFinite(v) ? v : posStore.right)
      }
      const reset = () => setPosition(DEFAULT_TOP, DEFAULT_RIGHT)

      return React.createElement("div", { className: "restart-service-settings" },
        React.createElement("h3", null, "重启按钮位置"),
        React.createElement("p", null, "调整按钮的偏移量（单位：像素），修改立即生效。"),
        React.createElement("label", { className: "restart-service-field" },
          React.createElement("span", null, "距离顶部（top）"),
          React.createElement("input", { type: "number", min: 0, value: top, onChange: onTop })
        ),
        React.createElement("label", { className: "restart-service-field" },
          React.createElement("span", null, "距离右侧（right）"),
          React.createElement("input", { type: "number", min: 0, value: right, onChange: onRight })
        ),
        React.createElement("button", { type: "button", className: "restart-service-reset", onClick: reset }, "恢复默认")
      )
    }

    const inject = ["slots"]

    function apply(ctx) {
      try {
        ctx.slots.inject("shell.overlay", () => ctx.slots.register(
          { name: "shell.overlay", id: "restart-service-button", order: 999, label: "重启服务" },
          () => React.createElement(RestartButton)
        ))
        ctx.slots.inject("settings.section", () => ctx.slots.register(
          { name: "settings.section", id: "restart-service-button", order: 50, label: "重启按钮" },
          () => React.createElement(PositionSettings)
        ))
      } catch (error) {
        console.warn("[restart-service-button] mount failed:", error)
      }
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
