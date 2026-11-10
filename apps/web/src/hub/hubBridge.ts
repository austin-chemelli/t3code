/**
 * Fork addition: the message contract between T3 and the project hub page shown in the Hub
 * panel. The hub is a separate local server (default http://localhost:8765); its side of this
 * contract lives in that repo's `static/hub.js`. Keep the two in step.
 */

const HUB_URL_STORAGE_KEY = "t3fork:hub-url";
const DEFAULT_HUB_URL = "http://localhost:8765";

export type HubTheme = "light" | "dark";

/** What the hub page may ask of T3. */
export type HubRequest =
  | { type: "ready"; path: string; title: string; root: string | null }
  | { type: "open-thread"; threadId: string; environmentId: string | null };

/** What T3 tells the hub page. */
export type HubCommand =
  | {
      type: "context";
      threadId: string | null;
      environmentId: string | null;
      theme: HubTheme;
    }
  | { type: "back" };

export function hubBaseUrl(): string {
  let configured: string | null = null;
  try {
    configured = globalThis.localStorage?.getItem(HUB_URL_STORAGE_KEY) ?? null;
  } catch {
    configured = null;
  }
  return (configured?.trim() || DEFAULT_HUB_URL).replace(/\/+$/, "");
}

export function hubOrigin(baseUrl: string): string | null {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return null;
  }
}

/** The page to load: the last page seen for this workspace, or the hub's resolver for its root. */
export function hubFrameUrl(input: {
  baseUrl: string;
  workspaceRoot: string | undefined;
  lastPath: string | undefined;
  theme: HubTheme;
}): string {
  const url = new URL(input.baseUrl);
  if (input.lastPath) {
    const last = new URL(input.lastPath, url);
    url.pathname = last.pathname;
    url.search = last.search;
    url.hash = last.hash;
  } else if (input.workspaceRoot) {
    url.pathname = "/open";
    url.searchParams.set("root", input.workspaceRoot);
  }
  url.searchParams.set("embed", "t3");
  url.searchParams.set("theme", input.theme);
  return url.toString();
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const MAX_ID_LENGTH = 512;
const isId = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= MAX_ID_LENGTH;

/** Reads a message from the hub frame; anything that is not a well-formed request is dropped. */
export function readHubRequest(data: unknown): HubRequest | undefined {
  if (!isRecord(data) || data.hub !== 1) return undefined;
  switch (data.type) {
    case "ready":
      if (typeof data.path !== "string" || !data.path.startsWith("/")) return undefined;
      return {
        type: "ready",
        path: data.path,
        title: typeof data.title === "string" ? data.title : "",
        root: typeof data.root === "string" && data.root.length > 0 ? data.root : null,
      };
    case "open-thread":
      if (!isId(data.threadId)) return undefined;
      return {
        type: "open-thread",
        threadId: data.threadId,
        environmentId: isId(data.environmentId) ? data.environmentId : null,
      };
    default:
      return undefined;
  }
}

export function hubCommandMessage(command: HubCommand): HubCommand & { t3: 1 } {
  return { t3: 1, ...command };
}
