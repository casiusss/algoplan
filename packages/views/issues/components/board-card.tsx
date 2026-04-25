"use client";

import { useCallback, memo } from "react";
import { AppLink } from "../../navigation";
import { useSortable } from "@dnd-kit/react/sortable";
import { toast } from "sonner";
import type { Issue, UpdateIssueRequest } from "@multica/core/types";
import { CalendarDays } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ActorAvatar } from "../../common/actor-avatar";
import { useUpdateIssue } from "@multica/core/issues/mutations";
import { useWorkspacePaths } from "@multica/core/paths";
import { useWorkspaceId } from "@multica/core/hooks";
import { projectListOptions } from "@multica/core/projects/queries";
import { PriorityIcon } from "./priority-icon";
import { PriorityPicker, AssigneePicker, DueDatePicker } from "./pickers";
import { PRIORITY_CONFIG } from "@multica/core/issues/config";
import { useViewStore } from "@multica/core/issues/stores/view-store-context";
import { ProgressRing } from "./progress-ring";
import { AccentBar } from "@multica/ui/components/ui/accent-bar";
import { priorityToAccentColor } from "../utils/priority-color";
import type { ChildProgress } from "./list-row";

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Stops event from bubbling to Link/drag handlers */
function PickerWrapper({ children }: { children: React.ReactNode }) {
  const stop = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };
  return (
    <div onClick={stop} onMouseDown={stop} onPointerDown={stop}>
      {children}
    </div>
  );
}

export const BoardCardContent = memo(function BoardCardContent({
  issue,
  editable = false,
  childProgress,
}: {
  issue: Issue;
  editable?: boolean;
  childProgress?: ChildProgress;
}) {
  const storeProperties = useViewStore((s) => s.cardProperties);
  const priorityCfg = PRIORITY_CONFIG[issue.priority];
  const wsId = useWorkspaceId();
  const { data: projects = [] } = useQuery({
    ...projectListOptions(wsId),
    enabled: storeProperties.project && !!issue.project_id,
  });
  const project = issue.project_id ? projects.find((p) => p.id === issue.project_id) : undefined;

  const updateIssueMutation = useUpdateIssue();
  const handleUpdate = useCallback(
    (updates: Partial<UpdateIssueRequest>) => {
      updateIssueMutation.mutate(
        { id: issue.id, ...updates },
        { onError: () => toast.error("Failed to update issue") },
      );
    },
    [issue.id, updateIssueMutation],
  );

  const showPriority = storeProperties.priority;
  const showDescription = storeProperties.description && issue.description;
  const showAssignee = storeProperties.assignee && issue.assignee_type && issue.assignee_id;
  const showDueDate = storeProperties.dueDate && issue.due_date;
  const showProject = storeProperties.project && project;
  const showChildProgress = storeProperties.childProgress && childProgress;

  return (
    <div
      data-board-card-root
      data-issue-id={issue.id}
      className="rounded-lg border-[0.5px] bg-card overflow-hidden shadow-[0_3px_6px_-2px_rgba(0,0,0,0.02),0_1px_1px_0_rgba(0,0,0,0.04)] transition-shadow group-hover:shadow-sm"
    >
      <AccentBar
        color={priorityToAccentColor(issue.priority)}
        segments={1}
        className="h-1 w-full rounded-none"
      />
      {/* Row 1: Identifier */}
      <p
        data-board-card-identifier
        className="pt-3 px-2.5 text-xs text-muted-foreground"
      >{issue.identifier}</p>

      {/* Row 2: Title */}
      <p className="mt-1 px-2.5 text-sm font-medium leading-snug line-clamp-2">
        {issue.title}
      </p>

      {/* Sub-issue progress + project */}
      {(showChildProgress || showProject) && (
        <div className="mt-1.5 px-2.5 flex items-center gap-1.5 flex-wrap">
          {showChildProgress && (
            <div className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5">
              <ProgressRing done={childProgress!.done} total={childProgress!.total} size={14} />
              <span className="text-[11px] text-muted-foreground tabular-nums font-medium">
                {childProgress!.done}/{childProgress!.total}
              </span>
            </div>
          )}
          {showProject && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground max-w-[160px]">
              <span aria-hidden="true" className="shrink-0">{project!.icon || "📁"}</span>
              <span className="truncate">{project!.title}</span>
            </span>
          )}
        </div>
      )}

      {/* Description */}
      {showDescription && (
        <p className="mt-1 px-2.5 text-xs text-muted-foreground line-clamp-1">
          {issue.description}
        </p>
      )}

      {/* Row 3: Assignee, priority badge, due date */}
      {(showAssignee || showPriority || showDueDate) && (
        <div className="mt-3 px-2.5 pb-3 flex items-center gap-2">
          {showAssignee &&
            (editable ? (
              <PickerWrapper>
                <AssigneePicker
                  assigneeType={issue.assignee_type}
                  assigneeId={issue.assignee_id}
                  onUpdate={handleUpdate}
                  trigger={
                    <ActorAvatar
                      actorType={issue.assignee_type!}
                      actorId={issue.assignee_id!}
                      size={22}
                    />
                  }
                />
              </PickerWrapper>
            ) : (
              <ActorAvatar
                actorType={issue.assignee_type!}
                actorId={issue.assignee_id!}
                size={22}
              />
            ))}
          {showPriority &&
            (editable ? (
              <PickerWrapper>
                <PriorityPicker
                  priority={issue.priority}
                  onUpdate={handleUpdate}
                  trigger={
                    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${priorityCfg.badgeBg} ${priorityCfg.badgeText}`}>
                      <PriorityIcon priority={issue.priority} className="h-3 w-3" inheritColor />
                      {priorityCfg.label}
                    </span>
                  }
                />
              </PickerWrapper>
            ) : (
              <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${priorityCfg.badgeBg} ${priorityCfg.badgeText}`}>
                <PriorityIcon priority={issue.priority} className="h-3 w-3" inheritColor />
                {priorityCfg.label}
              </span>
            ))}
          {showDueDate && (
            <div className="ml-auto">
              {editable ? (
                <PickerWrapper>
                  <DueDatePicker
                    dueDate={issue.due_date}
                    onUpdate={handleUpdate}
                    trigger={
                      <span
                        className={`flex items-center gap-1 text-xs ${
                          new Date(issue.due_date!) < new Date()
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        <CalendarDays className="size-3" />
                        {formatDate(issue.due_date!)}
                      </span>
                    }
                  />
                </PickerWrapper>
              ) : (
                <span
                  className={`flex items-center gap-1 text-xs ${
                    new Date(issue.due_date!) < new Date()
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  <CalendarDays className="size-3" />
                  {formatDate(issue.due_date!)}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

type DraggableBoardCardProps = {
  issue: Issue;
  /** Index of the card within its column. Threaded by `BoardColumn` (single source of truth per RESEARCH §Pattern Map). */
  cardIndex: number;
  editable?: boolean;
  childProgress?: ChildProgress;
};

/**
 * v0.4 sortable wrapper. The hook returns ONLY `{ref, isDragging, ...}` — the v6
 * idioms `attributes`, `listeners`, `transform`, `transition`, `CSS.Transform.toString`,
 * `defaultAnimateLayoutChanges` do NOT exist in the v0.4 React adapter (RESEARCH §Pitfall 1).
 * The activator and drop animation are wired internally via the `ref` callback.
 *
 * Activation distance (W-4 / RESEARCH Open Question Q3): v0.4's default PointerSensor
 * activation distance (~5px) is sufficient to keep clicks on the inner `<AppLink>` from
 * triggering a drag. If smoke testing reveals otherwise, board-view.tsx adds an explicit
 * `PointerSensor.configure({ activationConstraint: { distance: 5 } })` to its plugins.
 */
export const DraggableBoardCard = memo(function DraggableBoardCard({
  issue,
  cardIndex,
  editable = false,
  childProgress,
}: DraggableBoardCardProps) {
  const p = useWorkspacePaths();
  const { ref, isDragging } = useSortable({
    id: issue.id,
    index: cardIndex,
    group: issue.status,
    type: "card",
    accept: "card",
    data: { status: issue.status },
  });

  return (
    <div ref={ref} className={isDragging ? "opacity-30" : ""}>
      <AppLink
        href={p.issueDetail(issue.id)}
        className={`group block transition-colors ${isDragging ? "pointer-events-none" : ""}`}
      >
        <BoardCardContent issue={issue} editable={editable} childProgress={childProgress} />
      </AppLink>
    </div>
  );
});
