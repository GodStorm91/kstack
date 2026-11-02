#!/usr/bin/env node
// Usage: node check.mjs <artifact.html> [--png out.png] [--width 1280] [--height 800] [--dpr 2]
// Drives Chrome over CDP with Node's built-in WebSocket, so the skill needs no npm install.
import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const file = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : def
}
if (!file || !existsSync(file)) {
  console.error('usage: node check.mjs <artifact.html> [--png out.png] [--width 1280] [--height 800] [--dpr 2]')
  process.exit(2)
}
const png = opt('png', file.replace(/\.html?$/, '') + '.png')
const width = Number(opt('width', 1280)), height = Number(opt('height', 800)), dpr = Number(opt('dpr', 2))

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ]
  for (const c of candidates) if (c && existsSync(c)) return c
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try {
      return execFileSync('which', [bin]).toString().trim()
    } catch {}
  }
  throw new Error('check: no Chrome/Chromium found; set CHROME_PATH')
}

const profile = mkdtempSync(join(tmpdir(), 'kstack-check-'))
const chrome = spawn(findChrome(), [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] })

const cleanup = async () => {
  if (chrome.exitCode === null) {
    const { promise, resolve: done } = Promise.withResolvers()
    chrome.once('exit', done)
    chrome.kill()
    await promise
  }
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}

try {
  const wsUrl = await new Promise((ok, fail) => {
    let buf = ''
    const timer = setTimeout(() => fail(new Error('check: Chrome did not expose DevTools in 15s')), 15000)
    chrome.stderr.on('data', (d) => {
      buf += d
      const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf)
      if (m) {
        clearTimeout(timer)
        ok(m[1])
      }
    })
    chrome.on('exit', (code) => fail(new Error(`check: Chrome exited early (${code})`)))
  })

  const ws = new WebSocket(wsUrl)
  await new Promise((ok, fail) => {
    ws.onopen = ok
    ws.onerror = fail
  })
  let seq = 0
  const pending = new Map()
  const listeners = []
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) {
      const { ok, fail } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? fail(new Error(`${msg.error.message} ${msg.error.data ?? ''}`)) : ok(msg.result)
    } else if (msg.method) for (const l of listeners) l(msg)
  }
  const send = (method, params = {}, sessionId) =>
    new Promise((ok, fail) => {
      const id = ++seq
      pending.set(id, { ok, fail })
      ws.send(JSON.stringify({ id, method, params, sessionId }))
    })

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const page = (method, params) => send(method, params, sessionId)

  const consoleErrors = [], external = []
  const requests = new Map(), failed = []
  listeners.push((msg) => {
    if (msg.sessionId !== sessionId) return
    if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'assert'))
      consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
    if (msg.method === 'Runtime.exceptionThrown') consoleErrors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text)
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') consoleErrors.push(msg.params.entry.text)
    if (msg.method === 'Network.requestWillBeSent') {
      requests.set(msg.params.requestId, msg.params.request.url)
      if (!/^(data|file|about|blob):/.test(msg.params.request.url)) external.push(msg.params.request.url)
    }
    if (msg.method === 'Network.loadingFailed') failed.push(`${msg.params.errorText} ${(requests.get(msg.params.requestId) ?? '?').slice(0, 120)}`)
  })
  await Promise.all(['Runtime.enable', 'Log.enable', 'Page.enable', 'Network.enable'].map((m) => page(m)))
  await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false })
  await page('Page.navigate', { url: pathToFileURL(resolve(file)).href })

  const evaluate = async (expression) => (await page('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value
  const deadline = Date.now() + 20000
  while (!(await evaluate('Boolean(window.LooseleafInk?.status?.ready)'))) {
    if (Date.now() > deadline) throw new Error('check: ink runtime never became ready (missing kstack: script, or a script error)')
    await new Promise((r) => setTimeout(r, 100))
  }

  const report = await evaluate(`(() => {
    const s = LooseleafInk.status
    const de = document.documentElement
    const snap = () => [...document.querySelectorAll('svg[data-ll-ink]')].map((x) => x.innerHTML).join('|')
    const before = snap()
    LooseleafInk.render()
    const deterministic = before === snap()
    const loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replaceAll('"', ''))
    const inks = [...document.querySelectorAll('svg[data-ll-ink]')]
    for (const svg of inks) svg.style.display = 'none'
    const clipped = [...document.querySelectorAll('.ll-paper, .ll-card, .ll-slip, .ll-kraft, .ll-pad, .ll-sticky, .ll-slide, .ll-node, .ll-btn, .ll-field')]
      .filter((el) => el.scrollWidth > el.clientWidth + 1 || (getComputedStyle(el).overflow !== 'visible' && el.scrollHeight > el.clientHeight + 1))
      .map((el) => el.className + (el.id ? '#' + el.id : ''))
    const overflowX = de.scrollWidth > innerWidth + 1
    for (const svg of inks) svg.style.display = ''
    return {
      drawn: s.drawn,
      unresolved: s.unresolved,
      unknown: [...new Set(s.unknown)],
      deterministic,
      fontsLoaded: [...new Set(loaded)],
      overflowX,
      clipped,
      size: [de.scrollWidth, de.scrollHeight],
    }
  })()`)

  const { cssContentSize: c } = await page('Page.getLayoutMetrics')
  const shot = await page('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: Math.ceil(c.width), height: Math.ceil(c.height), scale: 1 } })
  mkdirSync(dirname(png), { recursive: true })
  writeFileSync(png, Buffer.from(shot.data, 'base64'))
  ws.close()

  const failures = [
    consoleErrors.length && `console errors: ${consoleErrors.join(' | ')}`,
    failed.length && `failed loads: ${failed.join(', ')}`,
    external.length && `external requests: ${external.join(', ')}`,
    report.drawn === 0 && 'no ink drawn: add data-ink elements',
    report.unresolved.length && `unresolved connectors: ${report.unresolved.join(', ')}`,
    report.unknown.length && `unknown data-ink kinds: ${report.unknown.join(', ')}`,
    !report.deterministic && 'ink changed on re-render: seeds are not stable',
    !report.fontsLoaded.includes('Kevin Sans') && 'Kevin Sans did not load',
    report.overflowX && 'page overflows horizontally',
    report.clipped.length && `content overflows: ${report.clipped.join(', ')}`,
  ].filter(Boolean)
  console.log(JSON.stringify({ file, png, ...report, consoleErrors, failed, external, ok: failures.length === 0, failures }, null, 2))
  process.exitCode = failures.length ? 1 : 0
} finally {
  await cleanup()
}
