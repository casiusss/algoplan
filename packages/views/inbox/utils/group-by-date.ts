import type { InboxItem } from "@multica/core/types";

/**
 * Date-bucket assignment for inbox grouping (UI-SPEC §Sub-Phase INB
 * §Date-bucket grouping).
 *
 * Boundaries (local time):
 *   - today      = same calendar day as `now`
 *   - yesterday  = the immediately preceding calendar day
 *   - this_week  = days -2 .. -6 inclusive (5 days)
 *   - older      = day -7 and earlier
 *
 * Per UI-SPEC test row "6 days ago → this_week, 7 days ago → older". The
 * boundary `startOf7DaysAgo` below is set to `today - 6 days` so that
 * `ts >= startOf7DaysAgo` matches days -6 .. -2 (yesterday is already
 * captured by the preceding branch). Day -7 falls through to `older`.
 */
export type InboxBucket = "today" | "yesterday" | "this_week" | "older";

export interface InboxBucketGroup {
  bucket: InboxBucket;
  items: InboxItem[];
}

const ORDER: readonly InboxBucket[] = [
  "today",
  "yesterday",
  "this_week",
  "older",
];

export function groupInboxByDate(
  items: InboxItem[],
  now: Date = new Date(),
): InboxBucketGroup[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);

  // today + 6 prior calendar days; days -6..-2 fall here once -1 is captured
  // by `>= startOfYesterday` above.
  const startOf7DaysAgo = new Date(startOfToday);
  startOf7DaysAgo.setDate(startOfToday.getDate() - 6);

  const buckets: Record<InboxBucket, InboxItem[]> = {
    today: [],
    yesterday: [],
    this_week: [],
    older: [],
  };

  for (const item of items) {
    const ts = new Date(item.created_at);
    if (ts >= startOfToday) buckets.today.push(item);
    else if (ts >= startOfYesterday) buckets.yesterday.push(item);
    else if (ts >= startOf7DaysAgo) buckets.this_week.push(item);
    else buckets.older.push(item);
  }

  return ORDER.flatMap((bucket) =>
    buckets[bucket].length > 0 ? [{ bucket, items: buckets[bucket] }] : [],
  );
}
