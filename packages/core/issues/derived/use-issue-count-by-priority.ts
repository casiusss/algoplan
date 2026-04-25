"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { issueListOptions } from "../queries";

export interface PriorityCountMap {
  readonly p0: number;
  readonly p1: number;
  readonly p2: number;
  readonly p3: number;
}

const EMPTY: PriorityCountMap = Object.freeze({ p0: 0, p1: 0, p2: 0, p3: 0 });

/**
 * Derived per-priority issue count for the given workspace.
 *
 * SHL-05 stability contract: returns the same object reference across
 * consecutive renders when the underlying issues array reference is stable.
 * EMPTY is a frozen module-level singleton so the undefined-wsId / undefined-data
 * / empty-issues branches all return the same reference every time.
 *
 * Priority mapping (verified Plan 00, packages/core/types/issue.ts):
 *   urgent → p0, high → p1, medium → p2, low → p3, none → excluded
 */
export function useIssueCountByPriority(
  wsId: string | undefined,
): PriorityCountMap {
  const { data: issues } = useQuery({
    ...issueListOptions(wsId ?? ""),
    enabled: !!wsId,
  });

  return useMemo(() => {
    if (!issues || issues.length === 0) return EMPTY;
    let p0 = 0;
    let p1 = 0;
    let p2 = 0;
    let p3 = 0;
    for (const issue of issues) {
      if (issue.priority === "urgent") p0++;
      else if (issue.priority === "high") p1++;
      else if (issue.priority === "medium") p2++;
      else if (issue.priority === "low") p3++;
    }
    return { p0, p1, p2, p3 };
  }, [issues]);
}
