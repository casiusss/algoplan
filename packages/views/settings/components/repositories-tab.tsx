"use client";

import { useEffect, useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import { Input } from "@algoplan/ui/components/ui/input";
import { Button } from "@algoplan/ui/components/ui/button";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@algoplan/core/auth";
import { useWorkspaceId } from "@algoplan/core/hooks";
import { useCurrentWorkspace } from "@algoplan/core/paths";
import { memberListOptions, workspaceKeys } from "@algoplan/core/workspace/queries";
import { api } from "@algoplan/core/api";
import type { Workspace, WorkspaceRepo } from "@algoplan/core/types";
import { SettingsSection } from "./settings-section";

export function RepositoriesTab() {
  const user = useAuthStore((s) => s.user);
  const workspace = useCurrentWorkspace();
  const wsId = useWorkspaceId();
  const qc = useQueryClient();
  const { data: members = [] } = useQuery(memberListOptions(wsId));

  const [repos, setRepos] = useState<WorkspaceRepo[]>(workspace?.repos ?? []);
  const [saving, setSaving] = useState(false);

  const currentMember = members.find((m) => m.user_id === user?.id) ?? null;
  const canManageWorkspace = currentMember?.role === "owner" || currentMember?.role === "admin";

  useEffect(() => {
    setRepos(workspace?.repos ?? []);
  }, [workspace]);

  const handleSave = async () => {
    if (!workspace) return;
    setSaving(true);
    try {
      const updated = await api.updateWorkspace(workspace.id, { repos });
      qc.setQueryData(workspaceKeys.list(), (old: Workspace[] | undefined) =>
        old?.map((ws) => (ws.id === updated.id ? updated : ws)),
      );
      toast.success("Repositories gespeichert");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Repositories konnten nicht gespeichert werden",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAddRepo = () => {
    setRepos([...repos, { url: "", description: "" }]);
  };

  const handleRemoveRepo = (index: number) => {
    setRepos(repos.filter((_, i) => i !== index));
  };

  const handleRepoChange = (index: number, field: keyof WorkspaceRepo, value: string) => {
    setRepos(repos.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  if (!workspace) return null;

  return (
    <div className="space-y-8">
      <SettingsSection heading="Repositories">
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Git-Repositories, die mit diesem Workspace verknüpft sind. Agenten klonen sie und arbeiten am Code.
          </p>

          {repos.map((repo, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1 space-y-1.5">
                <Input
                  type="url"
                  value={repo.url}
                  onChange={(e) => handleRepoChange(index, "url", e.target.value)}
                  disabled={!canManageWorkspace}
                  placeholder="https://git.example.com/org/repo.git"
                  className="text-sm"
                />
                <Input
                  type="text"
                  value={repo.description}
                  onChange={(e) => handleRepoChange(index, "description", e.target.value)}
                  disabled={!canManageWorkspace}
                  placeholder="Beschreibung (z. B. Go-Backend + Next.js-Frontend)"
                  className="text-sm"
                />
              </div>
              {canManageWorkspace && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveRepo(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}

          {canManageWorkspace && (
            <div className="flex items-center justify-between pt-1">
              <Button variant="outline" size="sm" onClick={handleAddRepo}>
                <Plus className="h-3 w-3" />
                Repository hinzufügen
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-3 w-3" />
                {saving ? "Wird gespeichert…" : "Speichern"}
              </Button>
            </div>
          )}

          {!canManageWorkspace && (
            <p className="text-xs text-muted-foreground">
              Nur Admins und Owner können Repositories verwalten.
            </p>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
