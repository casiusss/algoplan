"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Input } from "@multica/ui/components/ui/input";
import { Textarea } from "@multica/ui/components/ui/textarea";
import { Label } from "@multica/ui/components/ui/label";
import { Button } from "@multica/ui/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@multica/ui/components/ui/alert-dialog";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@multica/core/auth";
import { useLeaveWorkspace, useDeleteWorkspace } from "@multica/core/workspace/mutations";
import { useWorkspaceId } from "@multica/core/hooks";
import {
  memberListOptions,
  workspaceKeys,
  workspaceListOptions,
} from "@multica/core/workspace/queries";
import { api } from "@multica/core/api";
import {
  resolvePostAuthDestination,
  useCurrentWorkspace,
  useHasOnboarded,
} from "@multica/core/paths";
import { setCurrentWorkspace } from "@multica/core/platform";
import type { Workspace } from "@multica/core/types";
import { useNavigation } from "../../navigation";
import { DeleteWorkspaceDialog } from "./delete-workspace-dialog";
import { SettingsSection } from "./settings-section";

export function WorkspaceTab() {
  const user = useAuthStore((s) => s.user);
  const workspace = useCurrentWorkspace();
  const wsId = useWorkspaceId();
  const { data: members = [], isFetched: membersFetched } = useQuery(memberListOptions(wsId));
  const qc = useQueryClient();
  const leaveWorkspace = useLeaveWorkspace();
  const deleteWorkspace = useDeleteWorkspace();
  const navigation = useNavigation();
  const hasOnboarded = useHasOnboarded();

  /**
   * Send the user to a safe URL BEFORE the leave/delete mutation fires.
   * The destination is computed from the current cached workspace list,
   * minus the workspace that's about to go away.
   *
   * Why navigate first, not after:
   *   1. The backend broadcasts `workspace:deleted` / `member:removed` the
   *      moment the mutation lands. If the user is still on the soon-to-
   *      be-deleted workspace's URL when that event arrives, the realtime
   *      handler in `use-realtime-sync.ts` also triggers a relocation —
   *      and both code paths race with the mutation's own
   *      `invalidateQueries` refetch. The loser's in-flight fetch gets
   *      cancelled, surfacing as an unhandled `CancelledError`.
   *   2. Navigating first means by the time the WS event fires, the
   *      active workspace is already something else; the realtime
   *      handler's "current === deleted" check fails and its relocate
   *      branch no-ops.
   *   3. UX: the destructive flow feels instant (dialog closes → new
   *      workspace appears) even though the API hasn't responded yet.
   *
   * Strict order — exercised by workspace-tab.test.tsx safe-order regression:
   *   1. read destination from cached workspace list,
   *   2. setCurrentWorkspace(null, null) to clear the singleton,
   *   3. navigation.push(destination),
   *   4. THEN mutation.mutateAsync (in caller).
   */
  const navigateAwayFromCurrentWorkspace = () => {
    const cachedList =
      qc.getQueryData<Workspace[]>(workspaceListOptions().queryKey) ?? [];
    const remaining = cachedList.filter((w) => w.id !== workspace?.id);
    // 1. Read destination
    const destination = resolvePostAuthDestination(remaining, hasOnboarded);
    // 2. Clear the workspace-context singleton BEFORE navigating and BEFORE
    // the mutation fires. Three downstream consumers read it:
    //  1. Realtime `workspace:deleted` handler's "current === deleted"
    //     check — if the singleton still points at the deleting workspace
    //     when the WS event arrives, it fires a parallel relocate that
    //     races the mutation's invalidate and the settings page's own
    //     navigate, surfacing a CancelledError and a full-page reload.
    //  2. Chrome gating (`{slug && <AppSidebar />}` on desktop) — if the
    //     singleton lingers, the sidebar stays mounted while the deleted
    //     workspace is no longer in the list, and `useWorkspaceId` throws.
    //  3. API client's `X-Workspace-Slug` header — stale header post-
    //     delete is at best a 404, at worst leaks into the next query.
    setCurrentWorkspace(null, null);
    // 3. Push to the safe destination
    navigation.push(destination);
  };

  const [name, setName] = useState(workspace?.name ?? "");
  const [description, setDescription] = useState(workspace?.description ?? "");
  const [context, setContext] = useState(workspace?.context ?? "");
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    variant?: "destructive";
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const currentMember = members.find((m) => m.user_id === user?.id) ?? null;
  const canManageWorkspace = currentMember?.role === "owner" || currentMember?.role === "admin";
  const isOwner = currentMember?.role === "owner";
  // Mirror the backend invariant (server/internal/handler/workspace.go:569):
  // a workspace must always have at least one owner, so the sole owner can't
  // leave. Pre-flight here instead of letting the 400 round-trip become a
  // confusing toast — disable Leave and tell the user what they need to do.
  const ownerCount = members.filter((m) => m.role === "owner").length;
  const isSoleOwner = isOwner && ownerCount <= 1;
  const isSoleMember = members.length <= 1;

  useEffect(() => {
    setName(workspace?.name ?? "");
    setDescription(workspace?.description ?? "");
    setContext(workspace?.context ?? "");
  }, [workspace]);

  const handleSave = async () => {
    if (!workspace) return;
    setSaving(true);
    try {
      const updated = await api.updateWorkspace(workspace.id, {
        name,
        description,
        context,
      });
      qc.setQueryData(workspaceKeys.list(), (old: Workspace[] | undefined) =>
        old?.map((ws) => (ws.id === updated.id ? updated : ws)),
      );
      toast.success("Workspace-Einstellungen gespeichert");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Workspace-Einstellungen konnten nicht gespeichert werden",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveWorkspace = () => {
    if (!workspace) return;
    setConfirmAction({
      title: "Workspace verlassen",
      description: `${workspace.name} verlassen? Du verlierst den Zugriff, bis du erneut eingeladen wirst.`,
      variant: "destructive",
      onConfirm: async () => {
        setActionId("leave");
        // Navigate away FIRST so the realtime handler's
        // "current-workspace-deleted" branch doesn't race the mutation.
        navigateAwayFromCurrentWorkspace();
        try {
          await leaveWorkspace.mutateAsync(workspace.id);
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Workspace konnte nicht verlassen werden",
          );
        } finally {
          setActionId(null);
        }
      },
    });
  };

  const handleConfirmDelete = async () => {
    if (!workspace) return;
    setActionId("delete-workspace");
    // Close the dialog and navigate away FIRST. See navigateAwayFromCurrentWorkspace
    // comment for why: keeps the realtime `workspace:deleted` handler out
    // of the race so we don't end up with concurrent refetches cancelling
    // each other and surfacing CancelledError.
    setDeleteDialogOpen(false);
    navigateAwayFromCurrentWorkspace();
    try {
      await deleteWorkspace.mutateAsync(workspace.id);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Workspace konnte nicht gelöscht werden",
      );
    } finally {
      setActionId(null);
    }
  };

  if (!workspace) return null;

  return (
    <div className="space-y-8">
      {/* Workspace settings — Allgemein */}
      <SettingsSection heading="Allgemein">
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canManageWorkspace}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Beschreibung</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={!canManageWorkspace}
              className="mt-1 resize-none"
              placeholder="Worauf konzentriert sich dieser Workspace?"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Kontext</Label>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={4}
              disabled={!canManageWorkspace}
              className="mt-1 resize-none"
              placeholder="Hintergrundinformationen und Kontext für KI-Agenten in diesem Workspace"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Slug</Label>
            <div className="mt-1 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              {workspace.slug}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !name.trim() || !canManageWorkspace}
            >
              <Save className="h-3 w-3" />
              {saving ? "Wird gespeichert…" : "Speichern"}
            </Button>
          </div>
          {!canManageWorkspace && (
            <p className="text-xs text-muted-foreground">
              Nur Admins und Owner können Workspace-Einstellungen ändern.
            </p>
          )}
        </div>
      </SettingsSection>

      {/* Danger Zone — gated on the member query settling so the owner-only
          Delete button and the sole-owner Leave guidance don't flash in
          after mount. */}
      {membersFetched && (
        <SettingsSection
          heading="Gefahrenzone"
          tone="danger"
          id="danger-zone"
        >
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Workspace verlassen</p>
                <p className="text-xs text-muted-foreground">
                  {isSoleOwner
                    ? isSoleMember
                      ? "Du bist das einzige Mitglied. Lösche den Workspace, um zu gehen."
                      : "Du bist der einzige Owner. Befördere zuerst ein anderes Mitglied zum Owner oder lösche den Workspace."
                    : "Entferne dich aus diesem Workspace."}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLeaveWorkspace}
                disabled={actionId === "leave" || isSoleOwner}
              >
                {actionId === "leave" ? "Wird verlassen…" : "Workspace verlassen"}
              </Button>
            </div>

            {isOwner && (
              <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-destructive">Workspace löschen</p>
                  <p className="text-xs text-muted-foreground">
                    Lösche diesen Workspace und seine Daten dauerhaft.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={actionId === "delete-workspace"}
                >
                  {actionId === "delete-workspace" ? "Wird gelöscht…" : "Workspace löschen"}
                </Button>
              </div>
            )}
          </div>
        </SettingsSection>
      )}

      <AlertDialog open={!!confirmAction} onOpenChange={(v) => { if (!v) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmAction?.variant === "destructive" ? "destructive" : "default"}
              onClick={async () => {
                await confirmAction?.onConfirm();
                setConfirmAction(null);
              }}
            >
              Bestätigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteWorkspaceDialog
        workspaceName={workspace.name}
        loading={actionId === "delete-workspace"}
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          // Ignore close requests while the delete mutation is in flight
          // so the user can't accidentally dismiss mid-operation.
          if (actionId === "delete-workspace" && !open) return;
          setDeleteDialogOpen(open);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
