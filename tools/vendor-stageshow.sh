#!/bin/sh
# Copies upstream stageshow verbatim at a pinned commit. To update, change REF and re-run.
set -eu

REPO=https://github.com/benjitaylor/skills
SRC=stageshow
REF=802057409787133703c56001080169e347305572

repo=$(cd "$(dirname "$0")/.." && pwd)
work="$repo/.cache/vendor-$SRC"

rm -rf "$work"
git clone -q --filter=blob:none --no-checkout "$REPO" "$work"
git -C "$work" sparse-checkout set "$SRC"
git -C "$work" checkout -q "$REF"

rsync -a --delete "$work/$SRC/" "$repo/skills/$SRC/"
echo "vendored $REPO/$SRC@$REF -> skills/$SRC"
