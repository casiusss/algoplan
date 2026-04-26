import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockUser } = vi.hoisted(() => ({
  mockUser: {
    current: {
      id: "user-1",
      name: "Stephan Rieche",
      avatar_url: null as string | null,
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@algoplan/core/auth", () => ({
  useAuthStore: (selector: (s: { user: typeof mockUser.current; setUser: () => void }) => unknown) =>
    selector({ user: mockUser.current, setUser: vi.fn() }),
}));

vi.mock("@algoplan/core/api", () => ({
  api: {
    updateMe: vi.fn(async (patch: object) => ({ ...mockUser.current, ...patch })),
  },
}));

vi.mock("@algoplan/core/hooks/use-file-upload", () => ({
  useFileUpload: () => ({ upload: vi.fn(), uploading: false }),
}));

import { AccountTab } from "./account-tab";

describe("AccountTab", () => {
  beforeEach(() => {
    mockUser.current = {
      id: "user-1",
      name: "Stephan Rieche",
      avatar_url: null,
    };
  });

  it("wraps content in SettingsSection with German heading 'Profil'", () => {
    render(<AccountTab />);
    expect(screen.getByRole("heading", { name: "Profil" })).toBeInTheDocument();
  });

  it("renders SettingsSection body wrapper", () => {
    const { container } = render(<AccountTab />);
    expect(
      container.querySelector("[data-testid='settings-section-body']"),
    ).not.toBeNull();
  });

  it("renders German upload hint 'Klicke, um einen Avatar hochzuladen'", () => {
    render(<AccountTab />);
    expect(
      screen.getByText("Klicke, um einen Avatar hochzuladen"),
    ).toBeInTheDocument();
  });

  it("renders German Save button 'Profil aktualisieren'", () => {
    render(<AccountTab />);
    expect(
      screen.getByRole("button", { name: /Profil aktualisieren/ }),
    ).toBeInTheDocument();
  });

  it("falls back to AvatarInitial when user has no avatar_url", () => {
    mockUser.current = { id: "user-1", name: "Stephan Rieche", avatar_url: null };
    const { container } = render(<AccountTab />);
    // AvatarInitial uses data-slot="avatar-initial"
    expect(
      container.querySelector("[data-slot='avatar-initial']"),
    ).not.toBeNull();
  });

  it("uses <img> when user has avatar_url (no AvatarInitial fallback)", () => {
    mockUser.current = {
      id: "user-1",
      name: "Stephan Rieche",
      avatar_url: "https://example.com/me.png",
    };
    const { container } = render(<AccountTab />);
    expect(container.querySelector("img")).not.toBeNull();
    expect(
      container.querySelector("[data-slot='avatar-initial']"),
    ).toBeNull();
  });
});
