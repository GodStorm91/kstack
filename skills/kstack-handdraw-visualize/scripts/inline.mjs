#!/usr/bin/env node
// Usage: node inline.mjs <source.html> <out.html>
// Replaces the two kstack: placeholders with the bundled CSS and runtime, then refuses
// any remaining external resource so the output opens offline.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [input, output] = process.argv.slice(2)
if (!input || !output) {
  console.error('usage: node inline.mjs <source.html> <out.html>')
  process.exit(2)
}

const assets = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets')
let html = readFileSync(input, 'utf8')

const CSS_TAG = /<link\b[^>]*href=["']kstack:looseleaf\.css["'][^>]*>/
const JS_TAG = /<script\b[^>]*src=["']kstack:looseleaf-ink\.js["'][^>]*>\s*<\/script>/
const missing = [!CSS_TAG.test(html) && '<link rel="stylesheet" href="kstack:looseleaf.css">', !JS_TAG.test(html) && '<script src="kstack:looseleaf-ink.js"></script>'].filter(Boolean)
if (missing.length) {
  console.error(`inline: ${input} lacks ${missing.join(' and ')}`)
  process.exit(1)
}

const css = readFileSync(join(assets, 'looseleaf.css'), 'utf8').replaceAll('</style', '<\\/style')
const js = readFileSync(join(assets, 'looseleaf-ink.js'), 'utf8').replaceAll('</script', '<\\/script')
html = html.replace(CSS_TAG, () => `<style data-kstack>\n${css}\n</style>`).replace(JS_TAG, () => `<script data-kstack>\n${js}\n</script>`)

const external = [
  ...html.matchAll(/<(?:img|script|link|iframe|source|video|audio|embed|object)\b[^>]*\s(?:src|href|data)=["']((?:https?:)?\/\/[^"']+)["']/gi),
  ...html.matchAll(/url\(\s*["']?((?:https?:)?\/\/[^"')]+)/gi),
  ...html.matchAll(/@import\s+(?:url\()?\s*["']((?:https?:)?\/\/[^"']+)/gi),
].map((m) => m[1])
if (external.length) {
  console.error(`inline: external resources break offline use:\n  ${[...new Set(external)].join('\n  ')}`)
  process.exit(1)
}

writeFileSync(output, html)
console.log(`inline: wrote ${output} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB)`)
