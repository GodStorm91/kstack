#!/bin/sh
# kstack owns skills/kstack-stageshow, so this script only refreshes upstream in .cache and prints the merge commands.
set -eu

REPO=https://github.com/benjitaylor/skills
SRC=stageshow
REF=802057409787133703c56001080169e347305572

repo=$(cd "$(dirname "$0")/.." && pwd)
work="$repo/.cache/vendor-$SRC"
skill="skills/kstack-$SRC"

if [ ! -d "$work/.git" ]; then
  git clone -q --filter=blob:none --no-checkout "$REPO" "$work"
  git -C "$work" sparse-checkout set "$SRC"
fi
git -C "$work" fetch -q origin
git -C "$work" checkout -q --detach "$REF"
head=$(git -C "$work" rev-parse origin/HEAD)

echo "upstream $REPO/$SRC@$REF -> $work/$SRC"
echo "upstream HEAD is $head ($(git -C "$work" rev-list --count "$REF..$head" -- "$SRC") commits touch $SRC since REF)"
echo
echo "kstack edits since REF:"
echo "  diff -ru -x node_modules '$work/$SRC' '$repo/$skill'"
echo "upstream changes since REF:"
echo "  git -C '$work' diff --stat $REF $head -- $SRC"
echo "merge them after you commit kstack edits (apply -3 needs a clean index; conflicts get markers):"
echo "  git -C '$work' diff $REF $head --relative=$SRC | git -C '$repo' apply -3 --directory=$skill"
echo "then set REF=$head in tools/vendor-stageshow.sh"
