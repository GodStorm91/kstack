# kstack

This repository holds agent skills for Claude Code, Codex, and omp.

| Skill | What it does |
|---|---|
| `kstack:handdraw-visualize` | Renders diagrams, flows, mockups, comparison boards, and bar charts as one offline HTML file in the hand-drawn [Looseleaf](https://kevintngo.github.io/looseleaf/) style. |
| `kstack:stageshow` | Builds faux product UI in React, as a still or a cursor demo, and films it for review. Based on [benjitaylor/skills](https://github.com/benjitaylor/skills/tree/main/stageshow). |

## Install

```bash
git clone <this repo> ~/project/kstack
cd ~/project/kstack && sh tools/install.sh
```

`install.sh` links each `skills/<name>` folder into `~/.agents/skills`, `~/.claude/skills`, `~/.codex/skills`, `~/.omp/agent/skills`, and `~/.cursor/skills`. A re-run replaces an existing symlink at each target. It never overwrites a real folder. To use other roots, set `KSTACK_SKILL_ROOTS="dir1 dir2"`.

The links point to this checkout, so a `git pull` updates every harness.

## Develop

Git tracks the built assets, so the skill needs no build step. To rebuild them, do the steps below:

```bash
npm install
npm run build       # clones Looseleaf at the pinned commit into .cache/, bundles assets
npm run typecheck   # src/ against the upstream ink engine types; needs the .cache/ clone from build
npm run check       # inlines examples/showcase.html and checks it in headless Chrome
npm test            # gate regression tests: the good page passes, each kind of broken page fails
```

The source layout is as follows:

- `src/adapter.ts` is the DOM runtime. It reads `data-ink` attributes, measures elements, draws with the Looseleaf ink engine, and routes connectors.
- `src/looseleaf.css` holds the `ll-*` composition classes. The build puts the upstream design tokens in front of them.
- `tools/build.mjs` makes `assets/looseleaf-ink.js` (engine, adapter, and Kevin Sans fonts, with no React) and `assets/looseleaf.css`.

### Stageshow upstream

`skills/kstack-stageshow` started as a copy of [benjitaylor/skills](https://github.com/benjitaylor/skills) at the commit pinned in `tools/vendor-stageshow.sh`. kstack owns it now, so edit it here.

To review upstream changes, run `sh tools/vendor-stageshow.sh`. The script fetches upstream into `.cache/vendor-stageshow/` and checks out the pinned `REF`. It never writes into the skill. It prints the commands that diff the kstack edits against `REF`, list the upstream changes since `REF`, and apply them with a 3-way merge. After a merge, set `REF` to the upstream commit you merged.

Stageshow has its own dependencies. Run `npm install` inside `skills/kstack-stageshow` before you use its playground or filming scripts. Its `README.md` describes the checks.

## License

This repository uses the MIT license. The assets include Looseleaf code, tokens, and fonts, (c) 2026 Looseleaf contributors, under the MIT license.

`skills/kstack-stageshow` keeps its upstream license. Its code is MIT, (c) 2026 Benji Taylor. Its `NOTICE.md` lists the third-party artwork that the MIT license does not cover, such as the app icons in `assets/app-icons.ts`.
