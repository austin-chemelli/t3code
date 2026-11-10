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

- **Day to day:** the systemd user service `t3fork` serves the built app at
  <http://localhost:3783> (unit: `packaging/t3fork.service`, copied to
  `~/.config/systemd/user/`). After changing code: `vp run --filter t3 --filter @t3tools/web build`
  then `systemctl --user restart t3fork`. Logs: `journalctl --user -u t3fork -f`.
- **Sign in a browser:** `vp exec node apps/server/dist/bin.mjs pair --base-dir ~/.t3-fork`
  prints a one-time link.
- **Develop:** stop the service, then `vp run dev --home-dir ~/.t3-fork` (hot reload) and open
  the printed pairing link.
- The fork keeps its own data in `~/.t3-fork`, apart from the installed app's `~/.t3`. To start
  over from the installed app's projects and stopped threads:
  `vp run migrate-dev-db --base-dir ~/.t3-fork` (service stopped; this replaces the fork's data).

## Known gaps

- The Hub entry does nothing on a new, unsent thread: the right panel belongs to saved threads.
- Browser-based tests (`*.browser.tsx`) need `pnpm exec playwright install` first.
