import { describe, it, expect } from "vitest";

// Wave 0 smoke test — proves the test infrastructure (vitest + jsdom +
// setup.ts shims) is wired correctly. Wave 1 plans will add real
// component tests; this file can be deleted once those exist.
describe("packages/ui test infrastructure", () => {
  it("runs in jsdom environment with window available", () => {
    expect(typeof window).toBe("object");
    expect(typeof document).toBe("object");
  });

  it("has matchMedia shim from setup.ts", () => {
    expect(typeof window.matchMedia).toBe("function");
    const mql = window.matchMedia("(min-width: 768px)");
    expect(mql.matches).toBe(false);
  });

  it("has ResizeObserver shim from setup.ts", () => {
    expect(typeof globalThis.ResizeObserver).toBe("function");
    const ro = new ResizeObserver(() => {});
    expect(typeof ro.observe).toBe("function");
    expect(typeof ro.disconnect).toBe("function");
  });

  it("has elementFromPoint shim from setup.ts", () => {
    expect(typeof document.elementFromPoint).toBe("function");
    expect(document.elementFromPoint(0, 0)).toBeNull();
  });

  it("has memory localStorage shim from setup.ts", () => {
    expect(typeof window.localStorage).toBe("object");
    window.localStorage.setItem("smoke", "ok");
    expect(window.localStorage.getItem("smoke")).toBe("ok");
    window.localStorage.removeItem("smoke");
  });

  it("loads @testing-library/jest-dom matchers", () => {
    const el = document.createElement("div");
    el.textContent = "hello";
    document.body.appendChild(el);
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent("hello");
    el.remove();
  });
});
