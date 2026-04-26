"use client";

import { Cloud, Monitor } from "lucide-react";
import type { Agent } from "@multica/core/types";
import { AvatarInitial } from "@multica/ui/components/ui/avatar-initial";
import { ActorAvatar } from "../../common/actor-avatar";
import { statusConfig } from "../config";

const AGENT_STATUS_LABEL_DE: Record<string, string> = {
  idle: "Inaktiv",
  working: "Arbeitet",
  blocked: "Blockiert",
  error: "Fehler",
  offline: "Offline",
};

export function AgentListItem({
  agent,
  isSelected,
  onClick,
}: {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}) {
  const st = statusConfig[agent.status];
  const isArchived = !!agent.archived_at;
  const hasAvatar = !!agent.avatar_url;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
        isSelected ? "bg-accent" : "hover:bg-accent/50"
      }`}
    >
      {hasAvatar ? (
        <ActorAvatar
          actorType="agent"
          actorId={agent.id}
          size={32}
          className={`rounded-lg ${isArchived ? "opacity-50 grayscale" : ""}`}
        />
      ) : (
        <AvatarInitial
          name={agent.name}
          size="default"
          className={`rounded-lg ${isArchived ? "opacity-50 grayscale" : ""}`}
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`truncate text-sm font-medium ${isArchived ? "text-muted-foreground" : ""}`}>{agent.name}</span>
          {agent.runtime_mode === "cloud" ? (
            <Cloud className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Monitor className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {isArchived ? (
            <span className="text-xs text-muted-foreground">Archiviert</span>
          ) : (
            <>
              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
              <span className={`text-xs ${st.color}`}>{AGENT_STATUS_LABEL_DE[agent.status] ?? st.label}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
