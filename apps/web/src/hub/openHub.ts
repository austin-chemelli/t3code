/** Fork addition: entry points that open the Hub tab beside a thread. */
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { EnvironmentId, ThreadId, type ScopedThreadRef } from "@t3tools/contracts";

import { useRightPanelStore } from "~/rightPanelStore";

const NON_THREAD_ROOTS = new Set(["draft", "settings", "projects"]);

/** The server thread the main view shows, read from the address (`/<environment>/<thread>`). */
function activeThreadRefFromPath(pathname: string): ScopedThreadRef | null {
  const segments = pathname.split("/").filter((segment) => segment.length > 0);
  if (segments.length !== 2 || NON_THREAD_ROOTS.has(segments[0]!)) return null;
  try {
    return scopeThreadRef(
      EnvironmentId.make(decodeURIComponent(segments[0]!)),
      ThreadId.make(decodeURIComponent(segments[1]!)),
    );
  } catch {
    return null;
  }
}

export function openHub(threadRef: ScopedThreadRef): void {
  useRightPanelStore.getState().open(threadRef, "hub");
}

export function openHubForActiveThread(): void {
  const threadRef = activeThreadRefFromPath(window.location.pathname);
  if (threadRef !== null) openHub(threadRef);
}
