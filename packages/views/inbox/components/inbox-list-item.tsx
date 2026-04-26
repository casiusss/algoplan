"use client";

import { StatusIcon } from "../../issues/components";
import { ActorAvatar } from "../../common/actor-avatar";
import { Archive } from "lucide-react";
import { AccentBar } from "@multica/ui/components/ui/accent-bar";
import type { InboxItem } from "@multica/core/types";
import { InboxDetailLabel } from "./inbox-detail-label";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export { timeAgo };

export function InboxListItem({
  item,
  isSelected,
  onClick,
  onArchive,
}: {
  item: InboxItem;
  isSelected: boolean;
  onClick: () => void;
  onArchive: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-testid="inbox-list-item"
      data-unread={!item.read || undefined}
      className={`group relative flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        isSelected ? "bg-accent" : "hover:bg-accent/50"
      }`}
    >
      {/* UI-SPEC §Sub-Phase INB §Row restyle — unread leading AccentBar.
          The atom's `vertical` orientation gives a 1-column flex; we override
          width to 3px and pin to the row's full height via absolute inset. */}
      {!item.read && (
        <AccentBar
          color="brand"
          orientation="vertical"
          className="absolute left-0 inset-y-0 w-[3px] h-auto rounded-none"
        />
      )}
      <ActorAvatar
        actorType={item.actor_type ?? item.recipient_type}
        actorId={item.actor_id ?? item.recipient_id}
        size={28}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {/* Mobile fallback: brand-green dot inline with the title. The
                AccentBar above is the desktop affordance; the dot keeps the
                cue legible on narrow widths where 3px would compete with
                row padding. */}
            {!item.read && (
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand sm:hidden"
              />
            )}
            <span
              className={`truncate text-sm ${!item.read ? "font-medium" : "text-muted-foreground"}`}
            >
              {item.title}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span
              role="button"
              tabIndex={-1}
              title="Archive"
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onArchive();
                }
              }}
              className="hidden rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground group-hover:inline-flex"
            >
              <Archive className="h-3.5 w-3.5" />
            </span>
            {item.issue_status && (
              <StatusIcon status={item.issue_status} className="h-3.5 w-3.5 shrink-0" />
            )}
          </div>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className={`min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs ${item.read ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
            <InboxDetailLabel item={item} />
          </p>
          <span className={`shrink-0 text-xs ${item.read ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
            {timeAgo(item.created_at)}
          </span>
        </div>
      </div>
    </button>
  );
}
