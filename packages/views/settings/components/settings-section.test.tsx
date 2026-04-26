import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettingsSection } from "./settings-section";

describe("SettingsSection atom", () => {
  it("renders heading text and children", () => {
    render(
      <SettingsSection heading="Profil">
        <div data-testid="child">child content</div>
      </SettingsSection>,
    );
    expect(screen.getByRole("heading", { name: "Profil" })).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("heading has italic and font-semibold classes", () => {
    render(<SettingsSection heading="Profil">x</SettingsSection>);
    const heading = screen.getByRole("heading", { name: "Profil" });
    expect(heading.className).toContain("italic");
    expect(heading.className).toContain("font-semibold");
  });

  it("tone='default' body lacks border-destructive/30 and heading dot", () => {
    const { container } = render(
      <SettingsSection heading="Profil">x</SettingsSection>,
    );
    // No destructive border anywhere
    const bordered = container.querySelector("[class*='border-destructive/30']");
    expect(bordered).toBeNull();
    // No dot
    const dot = container.querySelector("[data-testid='settings-section-dot']");
    expect(dot).toBeNull();
  });

  it("tone='danger' body wrapper has border-destructive/30 AND a bg-destructive heading dot", () => {
    const { container } = render(
      <SettingsSection heading="Gefahrenzone" tone="danger">
        body
      </SettingsSection>,
    );
    const body = container.querySelector("[data-testid='settings-section-body']");
    expect(body).not.toBeNull();
    expect(body!.className).toContain("border-destructive/30");
    const dot = container.querySelector("[data-testid='settings-section-dot']");
    expect(dot).not.toBeNull();
    expect(dot!.className).toContain("bg-destructive");
  });

  it("heading dot is decorative (aria-hidden)", () => {
    const { container } = render(
      <SettingsSection heading="Gefahrenzone" tone="danger">
        body
      </SettingsSection>,
    );
    const dot = container.querySelector("[data-testid='settings-section-dot']")!;
    expect(dot.getAttribute("aria-hidden")).toBe("true");
  });

  it("forwards id prop to the section root", () => {
    const { container } = render(
      <SettingsSection heading="X" id="gefahrenzone">
        body
      </SettingsSection>,
    );
    const section = container.querySelector("section#gefahrenzone");
    expect(section).not.toBeNull();
  });
});
