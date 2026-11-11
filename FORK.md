# This fork

A personal fork of [pingdotgg/t3code](https://github.com/pingdotgg/t3code) that shows the project
hub (a separate local server, repo `austin-chemelli/hub`) inside T3 Code. Everything else is
upstream. `main` mirrors upstream untouched; the patches live on `austin`.

## What the fork adds

| Addition                                                                                                                                                                                                                               | Where                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Hub panel**: a right-panel tab that shows the hub's Board for the thread's workspace, with Board / Back / Reload / Open in browser. Clicking "open thread" on the Board opens that thread on the left and keeps the Board beside it. | New files in `apps/web/src/hub/`            |
| **Scripts set by agents show up**: `ProjectService` mirrors scripts into the settings override the clients and the worktree-setup runner read. A plain upstream bug fix.                                                               | `apps/server/src/project/ProjectService.ts` |

The hub page and T3 talk through `postMessage`; the contract is `apps/web/src/hub/hubBridge.ts`
here and `src/hub/static/hub.js` in the hub repo. The hub address defaults to
`http://localhost:8765`; override with `localStorage["t3fork:hub-url"]`.

## Upstream files this fork touches

Keep this list complete: it is where a rebase can conflict. Each edit is a few added lines.

| File                                                        | Edit                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| `apps/web/src/rightPanelStore.ts`                           | `"hub"` in `RIGHT_PANEL_KINDS`, the surface union and `singletonSurface` |
| `apps/web/src/closedViewStore.ts`                           | `case "hub"` beside the other singleton panels                           |
| `apps/web/src/components/RightPanelTabs.tsx`                | title, icon, and a "Hub" item in both add-panel lists                    |
| `apps/web/src/components/chat/RightPanelSurfaceContent.tsx` | `case "hub"` renders `HubPanel`                                          |
| `apps/web/src/components/CommandPalette.tsx`                | "Open project hub" action                                                |
| `apps/server/src/project/ProjectService.ts` (+ its test)    | `syncScriptsToSettings` after create and update                          |

Rules for new fork work: put code in new files (`apps/web/src/hub/`), touch an upstream file only
to register it, and add the file to the table above.

## Updating from upstream

```sh
git fetch upstream --tags
git switch main && git merge --ff-only upstream/main && git push origin main
git switch austin && git rebase <a stable upstream tag, e.g. v0.1.9>
vp i && vp run check:changed
```

Rebase onto stable release tags, not nightlies. A conflict will be in one of the files above.

## Running it

The fork runs as the systemd user service `t3fork` and serves the built app at
<http://localhost:3783>. It keeps its own data in `~/.t3-fork`, apart from the installed app's
`~/.t3`. Unit file: `fork/t3fork.service` (copied to `~/.config/systemd/user/`).

| To do this                    | Run                                                                                                                                            |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| See if it is up, read its log | `systemctl --user status t3fork`, `journalctl --user -u t3fork -f`                                                                             |
| Sign in a new browser         | `vp exec node apps/server/dist/bin.mjs auth pairing create --base-dir ~/.t3-fork --base-url http://localhost:3783` and open the link it prints |
| Put new code live             | `fork/deploy.sh` (see below)                                                                                                                   |

## Working on the fork from inside the fork

The service runs from the **live checkout**, `~/dev/t3code` on branch `austin`. Agents working on
the fork are themselves running inside that service, so:

- **Never edit, build or run a dev server in the live checkout.** Work in a git worktree on a
  branch cut from `austin` (not from `main`, which is upstream and has none of the fork's code).
- **Try changes with a dev server in your worktree:** `vp run dev`. It uses the worktree's own
  `.t3` data and its own ports (read them from the `[dev-runner]` line), so it cannot disturb the
  live fork. Stop it by the PID you started.
- **Never restart `t3fork` yourself**, and never `pkill` by name. Restarting stops every thread
  the fork is running, including yours.
- **Going live is Austin's call.** When he says to deploy, run `fork/deploy.sh` from any
  directory (the project script "Deploy fork" does the same). It refuses to run unless the live
  checkout is clean and on `austin`, builds, then restarts the service about 3 seconds later.
  `fork/deploy.sh <branch>` first fast-forwards `austin` to that local branch; use it only when
  Austin asks for that branch to go live. Expect your own turn to be cut off by the restart, so
  say what you are about to do before you run it.
- **Hub:** this repo has a hub (`.notes/hub/`, Board at <http://localhost:8765/t3code/>). The
  rules in `~/dev/CLAUDE.md` (Hub) apply: keep your track file current, put plans in
  `.notes/hub/plans/`. The worktree setup script links `.notes` into each worktree.
- **The hub's own code** is a separate repo, `~/dev/hub`. A change to the bridge needs both sides:
  `apps/web/src/hub/hubBridge.ts` here and `src/hub/static/hub.js` there.
- Upstream's `AGENTS.md` still applies to everything else (tests, lint, `vp run check:changed`).

## Known gaps

- Threads do not move between the fork and the installed app; each has its own data.

- The Hub entry does nothing on a new, unsent thread: the right panel belongs to saved threads.
- Browser-based tests (`*.browser.tsx`) need `pnpm exec playwright install` first.
