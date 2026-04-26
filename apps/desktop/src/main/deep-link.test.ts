import { describe, it, expect, vi } from "vitest";
import { handleDeepLink, PROTOCOL_NAME } from "./deep-link";

describe("handleDeepLink — algoplan:// scheme (Phase 7 atomic flip)", () => {
  it("PROTOCOL_NAME constant is 'algoplan' (not 'multica' — regression lock)", () => {
    expect(PROTOCOL_NAME).toBe("algoplan");
  });

  it("dispatches auth:token on algoplan://auth/callback?token=<jwt>", () => {
    const send = vi.fn();
    handleDeepLink("algoplan://auth/callback?token=jwt-abc-123", send);
    expect(send).toHaveBeenCalledWith("auth:token", "jwt-abc-123");
  });

  it("dispatches invite:open on algoplan://invite/<id>", () => {
    const send = vi.fn();
    handleDeepLink("algoplan://invite/inv_xyz", send);
    expect(send).toHaveBeenCalledWith("invite:open", "inv_xyz");
  });

  it("URL-decodes invite id (algoplan://invite/inv%2Fwith%2Fslashes)", () => {
    const send = vi.fn();
    handleDeepLink("algoplan://invite/inv%2Fwith%2Fslashes", send);
    expect(send).toHaveBeenCalledWith("invite:open", "inv/with/slashes");
  });

  it("rejects multica:// (legacy scheme — must NOT dispatch)", () => {
    const send = vi.fn();
    handleDeepLink("multica://auth/callback?token=jwt", send);
    expect(send).not.toHaveBeenCalled();
  });

  it("ignores unknown algoplan:// hostnames silently", () => {
    const send = vi.fn();
    handleDeepLink("algoplan://unknown-route/xyz", send);
    expect(send).not.toHaveBeenCalled();
  });

  it("ignores malformed URLs without throwing", () => {
    const send = vi.fn();
    expect(() => handleDeepLink("not a url at all", send)).not.toThrow();
    expect(send).not.toHaveBeenCalled();
  });

  it("no-op when send callback is null (mainWindow not yet ready)", () => {
    // Should not throw; covers the cold-start case where deep link arrives before window
    expect(() =>
      handleDeepLink("algoplan://auth/callback?token=jwt", null),
    ).not.toThrow();
  });
});
