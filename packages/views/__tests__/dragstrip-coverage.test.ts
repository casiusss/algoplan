/**
 * DragStrip coverage gate (UI-CHECK FLAG-5.3)
 *
 * Every full-window desktop view must mount `<DragStrip />` from
 * `@algoplan/views/platform` as the FIRST JSX child of a flex container.
 * Otherwise users on macOS cannot drag the window from the top edge —
 * `-webkit-app-region: drag` won't be applied to the chrome region.
 *
 * This test is the structural enforcement: it reads each enumerated source
 * file and, for EACH `<DragStrip` occurrence, walks backward through the
 * source to find the immediately-enclosing JSX open-tag. It then asserts
 * (a) that parent tag's className contains `flex`, and (b) nothing JSX
 * other than whitespace / comments / expression containers appears between
 * the parent open-tag and the DragStrip.
 *
 * Two-column step files (welcome / questionnaire / workspace / platform-fork /
 * runtime-connect / agent) mount one DragStrip per column — both are validated
 * because the gate iterates ALL `<DragStrip` occurrences in the file.
 *
 * Adding a new full-window view requires adding the file path to the
 * `FULL_WINDOW_VIEWS` array — the audit IS the code.
 *
 * SCOPE: only files that are independently rendered as a full window.
 * Components rendered INSIDE another full-window shell (e.g. `step-first-issue.tsx`
 * which renders inside `onboarding-flow.tsx`'s container) are NOT enumerated;
 * the parent shell already owns the DragStrip.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");

const FULL_WINDOW_VIEWS = [
  "workspace/new-workspace-page.tsx",
  "invite/invite-page.tsx",
  "workspace/no-access-page.tsx",
  "onboarding/onboarding-flow.tsx",
  "onboarding/steps/step-welcome.tsx",
  "onboarding/steps/step-questionnaire.tsx",
  "onboarding/steps/step-workspace.tsx",
  "onboarding/steps/step-platform-fork.tsx",
  "onboarding/steps/step-runtime-connect.tsx",
  "onboarding/steps/step-agent.tsx",
  "common/not-found-page.tsx",
  "modals/create-workspace.tsx",
] as const;

/**
 * Find every byte offset of `<DragStrip` in the source.
 */
function findDragStripIndices(src: string): number[] {
  const indices: number[] = [];
  let from = 0;
  while (true) {
    const idx = src.indexOf("<DragStrip", from);
    if (idx === -1) return indices;
    indices.push(idx);
    from = idx + "<DragStrip".length;
  }
}

/**
 * Walk back from `dragStripIdx` to find the JSX open-tag that immediately
 * encloses this DragStrip. Returns the open-tag's source slice (the entire
 * `<Tag ...>` substring) and its source-position end (one byte past `>`).
 *
 * Heuristic: scan backward for the last `>` that closes an open-tag (NOT a
 * self-closing `/>`) before `dragStripIdx`. The matching open-tag is the
 * one whose `<` precedes that `>`. If we land on a self-closing or close
 * tag we keep walking back, which means we pop the JSX tree by one level.
 *
 * For our enumerated files, every DragStrip is the first JSX child of its
 * parent — so walking back exactly one open-tag close (`>`) lands us on the
 * parent's open-tag.
 */
function findEnclosingOpenTag(
  src: string,
  dragStripIdx: number,
): { openTag: string; openTagEnd: number } | null {
  // Walk backward from dragStripIdx looking for the closest `>` that ends a
  // non-self-closing open-tag.
  let cursor = dragStripIdx - 1;
  while (cursor > 0) {
    const gt = src.lastIndexOf(">", cursor);
    if (gt < 0) return null;
    // Find the matching `<` for this `>` — same depth, no nested `<` between.
    const lt = src.lastIndexOf("<", gt);
    if (lt < 0) return null;
    const tag = src.slice(lt, gt + 1);

    // If this tag is a self-closing tag (`/>`) or a close tag (`</X>`), skip:
    // we need an OPEN tag (`<X ...>` without `/>`).
    const isSelfClosing = tag.endsWith("/>");
    const isCloseTag = tag.startsWith("</");

    if (!isSelfClosing && !isCloseTag) {
      // Make sure the tag name starts with a letter (excludes `<!--` HTML
      // comments and JSX `<>` fragments — handled separately).
      const nameMatch = tag.match(/^<([A-Za-z][A-Za-z0-9]*)\b/);
      if (nameMatch) {
        return { openTag: tag, openTagEnd: gt + 1 };
      }
    }

    // Otherwise, keep walking back past this entire tag.
    cursor = lt - 1;
  }
  return null;
}

/**
 * Returns true if `tag` (the source of a JSX open-tag) carries a className
 * attribute whose string value contains the substring "flex".
 */
function tagHasFlexClass(tag: string): boolean {
  // Match className="...flex..." OR className={`...flex...`} OR className={cn("...flex...")}
  const stringForm = /className="[^"]*\bflex\b[^"]*"/.test(tag);
  const exprForm = /className=\{[^}]*\bflex\b[^}]*\}/.test(tag);
  return stringForm || exprForm;
}

/**
 * Assert that nothing JSX-significant exists between the parent open-tag's
 * close `>` and `<DragStrip`. JSX comments, JSX expression containers, and
 * whitespace are allowed (we strip them before comparing).
 */
function assertNoJsxBetween(between: string): void {
  const cleaned = between
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\{[^{}]*\}/g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
  expect(cleaned).toBe("");
}

describe("DragStrip coverage gate (UI-CHECK FLAG-5.3)", () => {
  it.each(FULL_WINDOW_VIEWS)("%s contains <DragStrip", (rel) => {
    const src = readFileSync(join(ROOT, rel), "utf8");
    expect(src).toContain("<DragStrip");
  });

  it.each(FULL_WINDOW_VIEWS)(
    "%s mounts <DragStrip as the first child of every flex column it lives in",
    (rel) => {
      const src = readFileSync(join(ROOT, rel), "utf8");
      const dragStripIndices = findDragStripIndices(src);
      expect(
        dragStripIndices.length,
        `${rel}: at least one <DragStrip must be present`,
      ).toBeGreaterThan(0);

      for (const idx of dragStripIndices) {
        const enclosing = findEnclosingOpenTag(src, idx);
        expect(
          enclosing,
          `${rel}: could not locate the JSX parent of <DragStrip at byte ${idx}`,
        ).not.toBeNull();
        const { openTag, openTagEnd } = enclosing!;

        // (a) Parent must be a flex container.
        expect(
          tagHasFlexClass(openTag),
          `${rel}: parent of <DragStrip lacks 'flex' in className: ${openTag}`,
        ).toBe(true);

        // (b) Nothing JSX may appear between the parent open-tag and DragStrip.
        const between = src.slice(openTagEnd, idx);
        try {
          assertNoJsxBetween(between);
        } catch {
          throw new Error(
            `${rel}: a JSX element opens between the parent flex container and <DragStrip — DragStrip MUST be the first child. Between: ${JSON.stringify(between)}`,
          );
        }
      }
    },
  );
});
