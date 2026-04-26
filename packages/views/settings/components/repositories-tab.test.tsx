import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockMembers, mockWorkspace } = vi.hoisted(() => ({
  mockMembers: {
    current: [{ id: "m-1", user_id: "user-1", role: "owner" as const }],
  },
  mockWorkspace: {
    current: {
      id: "ws-1",
      name: "Acme",
      slug: "acme",
      repos: [{ url: "https://example.com/r.git", description: "Main repo" }],
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@algoplan/core/auth", () => ({
  useAuthStore: (selector: (s: { user: { id: string } }) => unknown) =>
    selector({ user: { id: "user-1" } }),
}));

vi.mock("@algoplan/core/hooks", () => ({
  useWorkspaceId: () => "ws-1",
}));

vi.mock("@algoplan/core/paths", () => ({
  useCurrentWorkspace: () => mockWorkspace.current,
}));

vi.mock("@algoplan/core/workspace/queries", () => ({
  memberListOptions: () => ({ queryKey: ["members"], queryFn: async () => [] }),
  workspaceKeys: { list: () => ["workspaces"] },
}));

vi.mock("@algoplan/core/api", () => ({
  api: { updateWorkspace: vi.fn() },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: mockMembers.current }),
  useQueryClient: () => ({ setQueryData: vi.fn() }),
}));

import { RepositoriesTab } from "./repositories-tab";

describe("RepositoriesTab", () => {
  beforeEach(() => {
    mockMembers.current = [{ id: "m-1", user_id: "user-1", role: "owner" }];
    mockWorkspace.current = {
      id: "ws-1",
      name: "Acme",
      slug: "acme",
      repos: [{ url: "https://example.com/r.git", description: "Main repo" }],
    };
  });

  it("wraps content in SettingsSection with German heading 'Repositories'", () => {
    render(<RepositoriesTab />);
    expect(
      screen.getByRole("heading", { name: "Repositories" }),
    ).toBeInTheDocument();
  });

  it("renders SettingsSection body wrapper", () => {
    const { container } = render(<RepositoriesTab />);
    expect(
      container.querySelector("[data-testid='settings-section-body']"),
    ).not.toBeNull();
  });

  it("renders the German add-repo button 'Repository hinzufügen'", () => {
    render(<RepositoriesTab />);
    expect(
      screen.getByRole("button", { name: /Repository hinzufügen/ }),
    ).toBeInTheDocument();
  });

  it("renders the German Save button 'Speichern'", () => {
    render(<RepositoriesTab />);
    expect(
      screen.getByRole("button", { name: /Speichern/ }),
    ).toBeInTheDocument();
  });

  it("renders the German info text about Git-Repositories and Agenten", () => {
    render(<RepositoriesTab />);
    expect(
      screen.getByText(
        /Git-Repositories.*verknüpft sind\. Agenten klonen sie/,
      ),
    ).toBeInTheDocument();
  });
});
