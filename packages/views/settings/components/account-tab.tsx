"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Save } from "lucide-react";
import { Input } from "@algoplan/ui/components/ui/input";
import { Label } from "@algoplan/ui/components/ui/label";
import { Button } from "@algoplan/ui/components/ui/button";
import { AvatarInitial } from "@algoplan/ui/components/ui/avatar-initial";
import { toast } from "sonner";
import { useAuthStore } from "@algoplan/core/auth";
import { api } from "@algoplan/core/api";
import { useFileUpload } from "@algoplan/core/hooks/use-file-upload";
import { SettingsSection } from "./settings-section";

export function AccountTab() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const { upload, uploading } = useFileUpload(api);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfileName(user?.name ?? "");
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected
    e.target.value = "";
    try {
      const result = await upload(file);
      if (!result) return;
      const updated = await api.updateMe({ avatar_url: result.link });
      setUser(updated);
      toast.success("Avatar aktualisiert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Avatar konnte nicht hochgeladen werden");
    }
  };

  const handleProfileSave = async () => {
    setProfileSaving(true);
    try {
      const updated = await api.updateMe({ name: profileName });
      setUser(updated);
      toast.success("Profil aktualisiert");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Profil konnte nicht aktualisiert werden");
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <SettingsSection heading="Profil">
        <div className="space-y-4">
          {/* Avatar upload */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="group relative h-16 w-16 shrink-0 rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <AvatarInitial
                  name={user?.name ?? "?"}
                  size="lg"
                  className="size-16 text-base"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <div className="text-xs text-muted-foreground">
              Klicke, um einen Avatar hochzuladen
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              type="search"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleProfileSave}
              disabled={profileSaving || !profileName.trim()}
            >
              <Save className="h-3 w-3" />
              {profileSaving ? "Wird aktualisiert…" : "Profil aktualisieren"}
            </Button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
