// Needs Chrome. Set CHROME_PATH when Chrome is not in a standard location.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const skill = new URL('../skills/kstack-handdraw-visualize/', import.meta.url).pathname
const dir = mkdtempSync(join(tmpdir(), 'kstack-test-'))
const run = (script, ...args) => spawnSync(process.execPath, [join(skill, 'scripts', script), ...args], { encoding: 'utf8' })

function inlineAndCheck(name, html) {
  const src = join(dir, `${name}.src.html`), out = join(dir, `${name}.html`)
  writeFileSync(src, html)
  const inl = run('inline.mjs', src, out)
  assert.equal(inl.status, 0, inl.stderr)
  const res = run('check.mjs', out, '--width', '1280')
  return { status: res.status, report: JSON.parse(res.stdout) }
}

const page = (body) => `<link rel="stylesheet" href="kstack:looseleaf.css"><body class="ll-desk">${body}<script src="kstack:looseleaf-ink.js"></script></body>`

test('showcase example passes every check, writing into folders that do not exist yet', () => {
  const out = join(dir, 'new', 'showcase.html'), png = join(dir, 'shots', 'showcase.png')
  const inl = run('inline.mjs', join(skill, 'examples/showcase.html'), out)
  assert.equal(inl.status, 0, inl.stderr)
  const res = run('check.mjs', out, '--png', png)
  const report = JSON.parse(res.stdout)
  assert.deepEqual(report.failures, [])
  assert.equal(res.status, 0)
  assert.ok(report.fontsLoaded.includes('Kevin Sans'))
  assert.ok(existsSync(png), 'check.mjs wrote the PNG')
})

test('dangling connector and unknown kind fail the check', () => {
  const { status, report } = inlineAndCheck('broken', page(`<div data-ink-canvas><div id="a" class="ll-node" data-ink="box">a</div><i data-ink="arrow" data-from="a" data-to="nope"></i><b data-ink="wiggle">w</b></div>`))
  assert.equal(status, 1)
  assert.deepEqual(report.unresolved, ['a -> nope'])
  assert.deepEqual(report.unknown, ['wiggle'])
})

test('content wider than the viewport fails the check', () => {
  const { status, report } = inlineAndCheck('wide', page(`<div class="ll-paper" data-ink="box" style="width: 1600px">too wide</div>`))
  assert.equal(status, 1)
  assert.equal(report.overflowX, true)
})

test('inline refuses remote resources and missing placeholders', () => {
  const remote = join(dir, 'remote.html')
  writeFileSync(remote, page('<img src="https://example.com/a.png">'))
  const r1 = run('inline.mjs', remote, join(dir, 'remote.out.html'))
  assert.equal(r1.status, 1)
  assert.match(r1.stderr, /https:\/\/example\.com\/a\.png/)

  const bare = join(dir, 'bare.html')
  writeFileSync(bare, '<div data-ink="box">x</div>')
  const r2 = run('inline.mjs', bare, join(dir, 'bare.out.html'))
  assert.equal(r2.status, 1)
  assert.match(r2.stderr, /kstack:looseleaf\.css/)
})
