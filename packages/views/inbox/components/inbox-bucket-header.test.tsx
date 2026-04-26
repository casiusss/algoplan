import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InboxBucketHeader } from "./inbox-bucket-header";

describe("InboxBucketHeader — German labels", () => {
  it.each([
    ["today", "Heute"],
    ["yesterday", "Gestern"],
    ["this_week", "Diese Woche"],
    ["older", "Älter"],
  ] as const)("renders %s as %s", (bucket, label) => {
    render(<InboxBucketHeader bucket={bucket} count={3} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe("InboxBucketHeader — count + structure", () => {
  it("renders the count next to the label", () => {
    render(<InboxBucketHeader bucket="today" count={5} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("uses sticky/h-9/bg-card/z-10/border-b classes", () => {
    const { container } = render(
      <InboxBucketHeader bucket="today" count={1} />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/\bsticky\b/);
    expect(root.className).toMatch(/\btop-0\b/);
    expect(root.className).toMatch(/\bz-10\b/);
    expect(root.className).toMatch(/\bbg-card\b/);
    expect(root.className).toMatch(/\bh-9\b/);
    expect(root.className).toMatch(/\bborder-b\b/);
  });

  it("heading uses italic font-semibold text-sm", () => {
    render(<InboxBucketHeader bucket="today" count={1} />);
    const heading = screen.getByText("Heute");
    expect(heading.className).toMatch(/\bitalic\b/);
    expect(heading.className).toMatch(/\bfont-semibold\b/);
    expect(heading.className).toMatch(/\btext-sm\b/);
  });
});
