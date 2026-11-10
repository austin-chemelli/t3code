import { describe, expect, it } from "vite-plus/test";

import { hubFrameUrl, readHubRequest } from "./hubBridge";

describe("readHubRequest", () => {
  it("accepts well-formed requests and drops everything else", () => {
    expect(readHubRequest({ hub: 1, type: "ready", path: "/nfl/", title: "Board" })).toEqual({
      type: "ready",
      path: "/nfl/",
      title: "Board",
      root: null,
    });
    expect(readHubRequest({ hub: 1, type: "open-thread", threadId: "t1" })).toEqual({
      type: "open-thread",
      threadId: "t1",
      environmentId: null,
    });
    expect(readHubRequest({ type: "open-thread", threadId: "t1" })).toBeUndefined();
    expect(readHubRequest({ hub: 1, type: "open-thread", threadId: "" })).toBeUndefined();
    expect(
      readHubRequest({ hub: 1, type: "ready", path: "https://evil.example/" }),
    ).toBeUndefined();
    expect(readHubRequest({ hub: 1, type: "send-prompt", text: "x" })).toBeUndefined();
    expect(readHubRequest("open-thread")).toBeUndefined();
  });
});

describe("hubFrameUrl", () => {
  it("resolves a workspace through the hub, then returns to the last page seen", () => {
    const base = { baseUrl: "http://localhost:8765", theme: "dark" as const };
    expect(hubFrameUrl({ ...base, workspaceRoot: "/home/a/dev/nfl", lastPath: undefined })).toBe(
      "http://localhost:8765/open?root=%2Fhome%2Fa%2Fdev%2Fnfl&embed=t3&theme=dark",
    );
    expect(
      hubFrameUrl({
        ...base,
        workspaceRoot: "/home/a/dev/nfl",
        lastPath: "/nfl/plans/m25#decisions",
      }),
    ).toBe("http://localhost:8765/nfl/plans/m25?embed=t3&theme=dark#decisions");
    // A stored path can never move the frame off the hub's origin.
    expect(
      hubFrameUrl({ ...base, workspaceRoot: undefined, lastPath: "//evil.example/x" }),
    ).toMatch(/^http:\/\/localhost:8765\//);
  });
});
