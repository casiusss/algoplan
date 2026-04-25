"use client";

import { useCallback } from "react";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@multica/ui/components/ui/segmented-control";
import {
  useViewStore,
  useViewStoreApi,
} from "@multica/core/issues/stores/view-store-context";
import type { ViewMode } from "@multica/core/issues/stores/view-store";

/**
 * KBN-04 — view-mode toggle. Wraps SegmentedControl around viewMode in the
 * view-store. Persistence is automatic (viewMode is in view-store partialize
 * allowlist at lines 193-194).
 *
 * Pitfall 10 (RESEARCH): the onValueChange callback must be memoised so Base
 * UI's ToggleGroup doesn't re-subscribe its internal handlers on every parent
 * render — without useCallback this triggers a re-render storm under fast
 * filter typing.
 */
export function ViewToggle() {
  const viewMode = useViewStore((s) => s.viewMode);
  const api = useViewStoreApi();
  const onValueChange = useCallback(
    (v: string) => api.getState().setViewMode(v as ViewMode),
    [api],
  );

  return (
    <SegmentedControl
      value={viewMode}
      onValueChange={onValueChange}
      aria-label="Ansicht wechseln"
    >
      <SegmentedControlItem value="board">Board</SegmentedControlItem>
      <SegmentedControlItem value="list">Liste</SegmentedControlItem>
    </SegmentedControl>
  );
}
