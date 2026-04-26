"use client";

import type { InboxBucket } from "../utils/group-by-date";

/**
 * Sticky date-bucket header for the inbox list (UI-SPEC §Sub-Phase INB
 * §Date-bucket grouping). Heading text uses Italic-Inter per the Phase 5
 * display-heading convention extended to inbox bucket labels.
 *
 * German labels per Copywriting Contract INB. The atom is intentionally
 * dumb — bucket → label mapping is pure and lives here so the page-level
 * code only handles list shape.
 */
const LABELS: Record<InboxBucket, string> = {
  today: "Heute",
  yesterday: "Gestern",
  this_week: "Diese Woche",
  older: "Älter",
};

interface InboxBucketHeaderProps {
  bucket: InboxBucket;
  count: number;
}

export function InboxBucketHeader({ bucket, count }: InboxBucketHeaderProps) {
  return (
    <div className="sticky top-0 z-10 flex h-9 items-center justify-between border-b border-border bg-card px-4">
      <h3 className="text-sm italic font-semibold">{LABELS[bucket]}</h3>
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
    </div>
  );
}
