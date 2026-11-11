#!/usr/bin/env bash
# Fork addition: build the live checkout and restart the fork's service (t3fork, :3783).
#
#   fork/deploy.sh            build what is checked out in the live checkout
#   fork/deploy.sh <branch>   first fast-forward `austin` to a local branch (only when Austin asks)
#
# The restart is handed to systemd, because the service owns the terminal or agent running this
# script: everything the fork is running stops when it restarts, this script included.
set -euo pipefail

LIVE="$HOME/dev/t3code"
export PATH="$HOME/.local/share/vite-plus/bin:$PATH"
cd "$LIVE"

branch="$(git branch --show-current)"
if [ "$branch" != "austin" ]; then
  echo "The live checkout ($LIVE) is on '$branch'; it must be on 'austin'." >&2
  exit 1
fi
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "The live checkout has uncommitted changes; commit or discard them first." >&2
  exit 1
fi

if [ "${1:-}" != "" ]; then
  git merge --ff-only "$1"
elif git rev-parse --abbrev-ref '@{upstream}' >/dev/null 2>&1; then
  git pull --ff-only
fi

vp i
vp run --filter t3 --filter @t3tools/web build

systemd-run --user --quiet --on-active=3 --unit "t3fork-restart-$(date +%s)" \
  systemctl --user restart t3fork
echo "Built $(git rev-parse --short HEAD). The fork restarts in about 3 seconds; reload its browser tab."
