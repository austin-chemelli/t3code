/**
 * Fork addition: the Hub right-panel tab. Shows the project hub (a separate local server) for the
 * thread's workspace in a frame, and opens threads when the hub page asks for one.
 */
import type { ScopedThreadRef } from "@t3tools/contracts";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon, ExternalLinkIcon, HomeIcon, RotateCwIcon } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "~/components/ui/button";
import { getRenderedAppearance, subscribeRenderedAppearance } from "~/hooks/useTheme";
import { useRightPanelStore } from "~/rightPanelStore";
import { buildThreadRouteParams } from "~/threadRoutes";

import {
  hubBaseUrl,
  hubCommandMessage,
  hubFrameUrl,
  hubOrigin,
  readHubRequest,
  type HubCommand,
} from "./hubBridge";

/** Last hub page per workspace, so a remounted panel returns to where the reader was. */
const lastPathByWorkspace = new Map<string, string>();

type HubStatus = "checking" | "online" | "offline";

export function HubPanel(props: {
  readonly threadRef: ScopedThreadRef;
  readonly workspaceRoot: string | undefined;
  readonly visible: boolean;
}) {
  const { threadRef, workspaceRoot } = props;
  const navigate = useNavigate();
  const theme = useSyncExternalStore(subscribeRenderedAppearance, getRenderedAppearance);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [baseUrl] = useState(hubBaseUrl);
  const [status, setStatus] = useState<HubStatus>("checking");
  const [attempt, setAttempt] = useState(0);
  const [title, setTitle] = useState("Hub");
  const workspaceKey = workspaceRoot ?? "";
  // The address is fixed per mount and reload; later page changes happen inside the frame.
  const [src, setSrc] = useState(() =>
    hubFrameUrl({
      baseUrl,
      workspaceRoot,
      lastPath: lastPathByWorkspace.get(workspaceKey),
      theme,
    }),
  );

  // Follow the reader to another project's Board when they switch threads themselves, but stay
  // put when the Board itself opened the thread (they are working down its list).
  const [openedFromHub, setOpenedFromHub] = useState(false);
  const [shownWorkspace, setShownWorkspace] = useState(workspaceKey);
  if (shownWorkspace !== workspaceKey) {
    setShownWorkspace(workspaceKey);
    if (openedFromHub) {
      setOpenedFromHub(false);
    } else {
      setSrc(
        hubFrameUrl({
          baseUrl,
          workspaceRoot,
          lastPath: lastPathByWorkspace.get(workspaceKey),
          theme,
        }),
      );
    }
  }

  const post = (command: HubCommand) => {
    const origin = hubOrigin(baseUrl);
    if (origin === null) return;
    frameRef.current?.contentWindow?.postMessage(hubCommandMessage(command), origin);
  };
  const sendContext = () =>
    post({
      type: "context",
      threadId: threadRef.threadId,
      environmentId: threadRef.environmentId,
      theme,
    });

  const probe = () => {
    fetch(`${baseUrl}/healthz`)
      .then((response) => setStatus(response.ok ? "online" : "offline"))
      .catch(() => setStatus("offline"));
  };
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- probes the external hub server once so an unreachable one shows guidance instead of a blank frame
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${baseUrl}/healthz`, { signal: controller.signal })
      .then((response) => setStatus(response.ok ? "online" : "offline"))
      .catch(() => {
        if (!controller.signal.aborted) setStatus("offline");
      });
    return () => controller.abort();
  }, [baseUrl]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- tells the hub frame which thread and theme are current
  useEffect(() => {
    sendContext();
  });

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- window message listener for requests from the hub frame
  useEffect(() => {
    const origin = hubOrigin(baseUrl);
    const onMessage = (event: MessageEvent) => {
      const frame = frameRef.current;
      if (frame === null || event.source !== frame.contentWindow || event.origin !== origin) return;
      const request = readHubRequest(event.data);
      if (request === undefined) return;
      if (request.type === "ready") {
        // Remember the page only while it belongs to this workspace's project, so a panel
        // rebuilt later returns to this project's hub and not one the reader wandered to.
        if (request.root === null || request.root === workspaceRoot) {
          lastPathByWorkspace.set(workspaceKey, request.path);
        }
        setTitle(request.title || "Hub");
        sendContext();
        return;
      }
      const target = scopeThreadRef(
        EnvironmentId.make(request.environmentId ?? threadRef.environmentId),
        ThreadId.make(request.threadId),
      );
      // The Board travels with the reader: it is open beside whichever thread they land on.
      setOpenedFromHub(true);
      useRightPanelStore.getState().open(target, "hub");
      void navigate({
        to: "/$environmentId/$threadId",
        params: buildThreadRouteParams(target),
      });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  });

  const reload = () => {
    probe();
    setAttempt((value) => value + 1);
    setSrc(
      hubFrameUrl({
        baseUrl,
        workspaceRoot,
        lastPath: lastPathByWorkspace.get(workspaceKey),
        theme,
      }),
    );
  };
  const goHome = () => {
    lastPathByWorkspace.delete(workspaceKey);
    setAttempt((value) => value + 1);
    setSrc(hubFrameUrl({ baseUrl, workspaceRoot, lastPath: undefined, theme }));
  };
  const openInBrowser = () => {
    const path = lastPathByWorkspace.get(workspaceKey) ?? "/";
    window.open(new URL(path, baseUrl).toString(), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border px-2">
        <Button size="icon-xs" variant="ghost" aria-label="Board" title="Board" onClick={goHome}>
          <HomeIcon className="size-3.5" />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="Back"
          title="Back"
          onClick={() => post({ type: "back" })}
        >
          <ArrowLeftIcon className="size-3.5" />
        </Button>
        <Button size="icon-xs" variant="ghost" aria-label="Reload" title="Reload" onClick={reload}>
          <RotateCwIcon className="size-3.5" />
        </Button>
        <span className="min-w-0 flex-1 truncate px-1 text-xs text-muted-foreground">{title}</span>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="Open in browser"
          title="Open in browser"
          onClick={openInBrowser}
        >
          <ExternalLinkIcon className="size-3.5" />
        </Button>
      </div>
      {status === "offline" ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm font-medium">The hub isn't running</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Nothing answered at {baseUrl}. Start it with{" "}
            <code className="rounded bg-muted px-1 py-0.5">systemctl --user start hub</code>, then
            retry.
          </p>
          <Button size="sm" variant="outline" onClick={reload}>
            Retry
          </Button>
        </div>
      ) : (
        <iframe
          key={`${src}:${attempt}`}
          ref={frameRef}
          src={src}
          title="Project hub"
          // The hub is the reader's own local server: it keeps scroll and theme in session
          // storage and holds a live-reload stream, so it needs its own origin.
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          className="min-h-0 w-full flex-1 border-0"
          onLoad={sendContext}
        />
      )}
    </div>
  );
}
