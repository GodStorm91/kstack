import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const LOOSELEAF_REPO = 'https://github.com/kevintngo/looseleaf'
const LOOSELEAF_SHA = '4bdb647940e2fefb3cebb394f3bad25c766a27d2'
const PIN = LOOSELEAF_SHA.slice(0, 12)

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(process.env.LOOSELEAF_DIR ?? join(root, '.cache/looseleaf'))
const skill = join(root, 'skills/kstack-handdraw-visualize')
const assets = join(skill, 'assets')

if (!existsSync(join(src, '.git'))) {
  mkdirSync(dirname(src), { recursive: true })
  execFileSync('git', ['clone', '--quiet', '--filter=blob:none', LOOSELEAF_REPO, src], { stdio: 'inherit' })
}
if (execFileSync('git', ['-C', src, 'rev-parse', 'HEAD']).toString().trim() !== LOOSELEAF_SHA) {
  execFileSync('git', ['-C', src, 'fetch', '--quiet', 'origin', LOOSELEAF_SHA], { stdio: 'inherit' })
  execFileSync('git', ['-C', src, 'checkout', '--quiet', LOOSELEAF_SHA], { stdio: 'inherit' })
}
mkdirSync(assets, { recursive: true })

// Kevin Sans: 8 @font-face rules share 2 woff2 files. Ship each file once and let the runtime
// register the faces with the FontFace API, instead of inlining every file 4 times into CSS.
const fontsDir = join(src, 'public/fonts')
const faces = [...readFileSync(join(fontsDir, 'kevin-sans.css'), 'utf8').matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => {
  const decl = Object.fromEntries([...body.matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)].map(([, k, v]) => [k, v.trim()]))
  const file = /url\("([^"]+\.woff2)"\)/.exec(decl.src)?.[1]
  if (!file) throw new Error(`kevin-sans.css: no woff2 src in ${body}`)
  const desc = { weight: decl['font-weight'], style: decl['font-style'], display: 'block' }
  for (const [css, js] of [['size-adjust', 'sizeAdjust'], ['ascent-override', 'ascentOverride'], ['descent-override', 'descentOverride'], ['line-gap-override', 'lineGapOverride']])
    if (decl[css]) desc[js] = decl[css]
  return { family: decl['font-family'].replaceAll('"', ''), file, desc }
})
const fontFiles = Object.fromEntries([...new Set(faces.map((f) => f.file))].map((f) => [f, readFileSync(join(fontsDir, f)).toString('base64')]))

const alias = {
  name: 'looseleaf-alias',
  setup(b) {
    b.onResolve({ filter: /^react($|\/)|^react-dom/ }, (args) => ({ errors: [{ text: `ink bundle must not import ${args.path} (from ${args.importer})` }] }))
    b.onResolve({ filter: /^@\// }, (args) => b.resolve('./' + args.path.slice(2), { resolveDir: join(src, 'src'), kind: args.kind }))
    b.onResolve({ filter: /^kstack:fonts$/ }, () => ({ path: 'kstack:fonts', namespace: 'kstack' }))
    b.onLoad({ filter: /.*/, namespace: 'kstack' }, () => ({
      contents: `export const FILES = ${JSON.stringify(fontFiles)}\nexport const FACES = ${JSON.stringify(faces)}\n`,
      loader: 'js',
    }))
  },
}
const js = await build({
  entryPoints: [join(root, 'src/entry.ts')],
  bundle: true,
  format: 'iife',
  globalName: 'LooseleafInk',
  platform: 'browser',
  target: ['chrome119', 'safari17.4', 'firefox121'],
  minify: true,
  legalComments: 'none',
  define: { 'import.meta': '{}' },
  banner: { js: `/* kstack handdraw runtime. Looseleaf ink engine ${PIN}, (c) 2026 Looseleaf contributors, MIT. */` },
  plugins: [alias],
  outfile: join(assets, 'looseleaf-ink.js'),
  metafile: true,
  logLevel: 'warning',
})

// Light-theme tokens: the blocks before Tailwind's `@theme inline` are custom properties, preceded by
// Tailwind-only `@import` / `@custom-variant` statements that a plain browser cannot resolve.
const upstreamCss = readFileSync(join(src, 'src/styles/looseleaf.css'), 'utf8')
const themeAt = upstreamCss.indexOf('@theme inline')
if (themeAt < 0) throw new Error('looseleaf.css: `@theme inline` marker not found; re-check the token range')
const tokens = upstreamCss.slice(0, themeAt).replace(/^@(import|custom-variant)\b[^;]*;\n?/gm, '').trim()
const leftover = /^\s*@(?!media|supports)[a-z-]+/m.exec(tokens)
if (leftover) throw new Error(`looseleaf.css: unexpected at-rule in token range: ${leftover[0]}`)

const css = [
  `/* kstack handdraw styles. Tokens from Looseleaf ${PIN}, (c) 2026 Looseleaf contributors, MIT. The runtime registers Kevin Sans. */`,
  tokens,
  readFileSync(join(root, 'src/looseleaf.css'), 'utf8').trim(),
  '',
].join('\n\n')
writeFileSync(join(assets, 'looseleaf.css'), css)
copyFileSync(join(src, 'LICENSE'), join(skill, 'LICENSE-looseleaf.txt'))

const kib = (n) => `${(n / 1024).toFixed(1)} KiB`
console.log(`looseleaf-ink.js ${kib(Object.values(js.metafile.outputs)[0].bytes)}, looseleaf.css ${kib(Buffer.byteLength(css))}, looseleaf ${PIN}`)
