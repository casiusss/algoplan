"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@algoplan/ui/components/ui/sidebar";
import { api } from "@algoplan/core/api";
import { inboxKeys, deduplicateInboxItems } from "@algoplan/core/inbox/queries";
import { useWorkspacePaths } from "@algoplan/core/paths";
import type { InboxItem } from "@algoplan/core/types";
import { AppLink, useNavigation } from "../navigation";

const EMPTY_INBOX: InboxItem[] = [];

export interface NotificationsBadgeProps {
  /** Workspace id passed as a prop so the atom never calls the useWorkspaceId hook. */
  wsId: string | undefined;
}

/**
 * Inbox sidebar row with unread mini-badge. When `wsId` is undefined the
 * underlying TanStack Query is disabled (no API request) and the row renders
 * its zero-count form — matches the wsId-pass-through contract from UI-SPEC.
 */
export function NotificationsBadge({ wsId }: NotificationsBadgeProps) {
  const { pathname } = useNavigation();
  const wsPaths = useWorkspacePaths();
  const href = wsPaths.inbox();
  const isActive = pathname === href;

  const { data: inboxItems = EMPTY_INBOX } = useQuery({
    queryKey: wsId ? inboxKeys.list(wsId) : (["inbox", "disabled"] as const),
    queryFn: () => api.listInbox(),
    enabled: !!wsId,
  });

  const unreadCount = useMemo(
    () => deduplicateInboxItems(inboxItems).filter((i) => !i.read).length,
    [inboxItems],
  );

  const ariaLabel =
    unreadCount > 0
      ? `Inbox, ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
      : "Inbox";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        render={<AppLink href={href} />}
        aria-label={ariaLabel}
        className="text-muted-foreground hover:not-data-active:bg-sidebar-accent/70 data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground"
      >
        <Inbox />
        <span>Inbox</span>
        {unreadCount > 0 && (
          <span className="ml-auto inline-flex size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-semibold tabular-nums leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
