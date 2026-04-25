import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../layout/dashboard-guard", () => ({
  DashboardGuard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-guard">{children}</div>
  ),
}));

vi.mock("@multica/ui/components/ui/sidebar", () => ({
  SidebarProvider: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="sidebar-provider" className={className}>
      {children}
    </div>
  ),
  SidebarInset: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="sidebar-inset" className={className}>
      {children}
    </div>
  ),
}));

vi.mock("./app-sidebar", () => ({
  AppSidebar: (props: {
    wsId?: string;
    topSlot?: React.ReactNode;
    searchSlot?: React.ReactNode;
  }) => (
    <aside
      data-testid="app-sidebar"
      data-wsid={props.wsId ?? ""}
      data-has-search={props.searchSlot ? "true" : "false"}
    >
      {props.topSlot}
    </aside>
  ),
}));

vi.mock("./app-topbar", () => ({
  AppTopbar: (props: { wsId?: string; searchSlot?: React.ReactNode }) => (
    <div data-testid="app-topbar" data-wsid={props.wsId ?? ""}>
      {props.searchSlot ?? <span data-testid="default-search">default</span>}
    </div>
  ),
}));

vi.mock("../modals/registry", () => ({
  ModalRegistry: () => <div data-testid="modal-registry" />,
}));

import { DashboardShell } from "./dashboard-shell";

describe("DashboardShell", () => {
  it("renders DashboardGuard + SidebarProvider + AppSidebar + SidebarInset { AppTopbar + children + ModalRegistry }", () => {
    render(
      <DashboardShell wsId="ws-1">
        <main data-testid="page-content">page</main>
      </DashboardShell>,
    );
    expect(screen.getByTestId("dashboard-guard")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-provider")).toBeInTheDocument();
    expect(screen.getByTestId("app-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-inset")).toBeInTheDocument();
    expect(screen.getByTestId("app-topbar")).toBeInTheDocument();
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
    expect(screen.getByTestId("modal-registry")).toBeInTheDocument();
  });

  it("when topSlot is undefined: NO DOM element exists between SidebarProvider and AppSidebar (SC#2)", () => {
    render(
      <DashboardShell wsId="ws-1">
        <main>page</main>
      </DashboardShell>,
    );
    const provider = screen.getByTestId("sidebar-provider");
    // First child of SidebarProvider must be the AppSidebar — no <div> wrapper above it.
    expect(provider.firstElementChild).toBe(screen.getByTestId("app-sidebar"));
  });

  it("when topSlot is provided: it is the FIRST child of SidebarProvider, BEFORE AppSidebar", () => {
    render(
      <DashboardShell wsId="ws-1" topSlot={<div data-testid="drag-strip" />}>
        <main>page</main>
      </DashboardShell>,
    );
    const provider = screen.getByTestId("sidebar-provider");
    const dragStrip = screen.getByTestId("drag-strip");
    const sidebar = screen.getByTestId("app-sidebar");
    expect(provider.firstElementChild).toBe(dragStrip);

    // Confirm DOM order: drag-strip precedes app-sidebar.
    const order = dragStrip.compareDocumentPosition(sidebar);
    expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("forwards searchSlot to AppTopbar (replaces default search)", () => {
    render(
      <DashboardShell
        wsId="ws-1"
        searchSlot={<div data-testid="custom-search">custom</div>}
      >
        <main>page</main>
      </DashboardShell>,
    );
    expect(screen.getByTestId("custom-search")).toBeInTheDocument();
    expect(screen.queryByTestId("default-search")).toBeNull();
  });

  it("forwards wsId to BOTH AppSidebar and AppTopbar", () => {
    render(
      <DashboardShell wsId="ws-42">
        <main>page</main>
      </DashboardShell>,
    );
    expect(screen.getByTestId("app-sidebar").getAttribute("data-wsid")).toBe(
      "ws-42",
    );
    expect(screen.getByTestId("app-topbar").getAttribute("data-wsid")).toBe(
      "ws-42",
    );
  });

  it("renders extra ReactNode inside SidebarInset AFTER children + ModalRegistry", () => {
    render(
      <DashboardShell
        wsId="ws-1"
        extra={<div data-testid="extra">extra</div>}
      >
        <main data-testid="page-content">page</main>
      </DashboardShell>,
    );
    const inset = screen.getByTestId("sidebar-inset");
    const children = Array.from(inset.children);
    const topbarIdx = children.findIndex(
      (c) => c.getAttribute("data-testid") === "app-topbar",
    );
    const pageIdx = children.findIndex(
      (c) => c.getAttribute("data-testid") === "page-content",
    );
    const modalIdx = children.findIndex(
      (c) => c.getAttribute("data-testid") === "modal-registry",
    );
    const extraIdx = children.findIndex(
      (c) => c.getAttribute("data-testid") === "extra",
    );
    expect(topbarIdx).toBe(0);
    expect(pageIdx).toBe(1);
    expect(modalIdx).toBe(2);
    expect(extraIdx).toBe(3);
  });

  it("forwards sidebarTopSlot through AppSidebar.topSlot (Pitfall 2 dual-slot)", () => {
    render(
      <DashboardShell
        wsId="ws-1"
        sidebarTopSlot={<div data-testid="sidebar-top" />}
      >
        <main>page</main>
      </DashboardShell>,
    );
    const sidebar = screen.getByTestId("app-sidebar");
    expect(sidebar.querySelector("[data-testid='sidebar-top']")).toBeTruthy();
  });

  it("forwards searchSlot to AppSidebar (legacy desktop sidebar search slot)", () => {
    render(
      <DashboardShell
        wsId="ws-1"
        searchSlot={<div data-testid="custom-search" />}
      >
        <main>page</main>
      </DashboardShell>,
    );
    expect(
      screen.getByTestId("app-sidebar").getAttribute("data-has-search"),
    ).toBe("true");
  });

  it("works with wsId={undefined} (no throw, both children get empty data-wsid)", () => {
    expect(() =>
      render(
        <DashboardShell>
          <main>page</main>
        </DashboardShell>,
      ),
    ).not.toThrow();
    expect(screen.getByTestId("app-sidebar").getAttribute("data-wsid")).toBe(
      "",
    );
    expect(screen.getByTestId("app-topbar").getAttribute("data-wsid")).toBe(
      "",
    );
  });
});
