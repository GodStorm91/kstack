# Notice

This skill is a port of the `statechart` skill from pstack by Lauren Tan.

- Upstream: https://github.com/backnotprop/pstack/tree/main/skills/statechart
- Copied from: https://github.com/cursor/plugins (`pstack/skills/statechart`), commit `4dd1d05818d19792e7cd6e818f1667f95f7e1dbe`. The last upstream change to the skill is `519d36a` (2026-10-26).
- License: MIT, (c) 2026 Lauren Tan. `LICENSE` holds the full text.

kstack owns this copy. kstack changed 2 files:

- `SKILL.md`: the skill id `kstack:statechart`, the description, the invoke forms, the `SKILL_DIR` run line, the runtime and TLC notes, a cross-link to `kstack:handdraw-visualize`, and the credit line.
- `scripts/test/cli.test.ts`: the symlink test builds its relative link from the real path of the temp folder. On macOS, `/var` is a symlink to `/private/var`, and the upstream test fails there.

The other scripts, the tests, the corpus, and `references/render.md` match upstream byte for byte.
