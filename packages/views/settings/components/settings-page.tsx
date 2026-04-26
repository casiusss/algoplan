"use client";

import React, { useState } from "react";
import { User, Palette, Key, Settings, Users, FolderGit2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@multica/ui/components/ui/tabs";
import { useCurrentWorkspace } from "@multica/core/paths";
import { AccountTab } from "./account-tab";
import { AppearanceTab } from "./appearance-tab";
import { TokensTab } from "./tokens-tab";
import { WorkspaceTab } from "./workspace-tab";
import { MembersTab } from "./members-tab";
import { RepositoriesTab } from "./repositories-tab";

const accountTabs = [
  { value: "profile", label: "Profil", icon: User },
  { value: "appearance", label: "Erscheinungsbild", icon: Palette },
  { value: "tokens", label: "API-Tokens", icon: Key },
];

const workspaceTabs = [
  { value: "workspace", label: "Allgemein", icon: Settings },
  { value: "repositories", label: "Repositories", icon: FolderGit2 },
  { value: "members", label: "Mitglieder", icon: Users },
];

export interface ExtraSettingsTab {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

interface SettingsPageProps {
  /** Additional tabs injected by platform (e.g. desktop daemon settings) */
  extraAccountTabs?: ExtraSettingsTab[];
}

export function SettingsPage({ extraAccountTabs }: SettingsPageProps = {}) {
  const workspaceName = useCurrentWorkspace()?.name;
  // Local controlled tab state — needed so the [Gefahrenzone] quick-jump can
  // both swap the active tab AND scroll-into-view the destination section in
  // the same click. Defaults match the previous `defaultValue="profile"`.
  const [activeTab, setActiveTab] = useState("profile");

  const handleGefahrenzoneJump = () => {
    setActiveTab("workspace");
    // Defer until React commits the tab swap so the danger-zone <section>
    // exists in the DOM before we try to scroll to it.
    requestAnimationFrame(() => {
      document
        .getElementById("danger-zone")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v)}
      orientation="vertical"
      className="flex-1 min-h-0 gap-0"
    >
      {/* Left nav */}
      <div
        data-testid="settings-left-nav"
        className="w-52 shrink-0 border-r overflow-y-auto p-4 bg-sidebar"
      >
        <h1 className="text-sm font-semibold mb-4 px-2">Einstellungen</h1>
        <TabsList variant="line" className="flex-col items-stretch">
          {/* Mein Konto group */}
          <span className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">
            Mein Konto
          </span>
          {accountTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
          {extraAccountTabs?.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}

          {/* Workspace group */}
          <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-4">
            <span className="text-xs font-medium text-muted-foreground truncate">
              {workspaceName ?? "Workspace"}
            </span>
            <button
              type="button"
              onClick={handleGefahrenzoneJump}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Gefahrenzone
            </button>
          </div>
          {workspaceTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* Right content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="w-full max-w-3xl mx-auto p-6">
          <TabsContent value="profile"><AccountTab /></TabsContent>
          <TabsContent value="appearance"><AppearanceTab /></TabsContent>
          <TabsContent value="tokens"><TokensTab /></TabsContent>
          <TabsContent value="workspace"><WorkspaceTab /></TabsContent>
          <TabsContent value="repositories"><RepositoriesTab /></TabsContent>
          <TabsContent value="members"><MembersTab /></TabsContent>
          {extraAccountTabs?.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>{tab.content}</TabsContent>
          ))}
        </div>
      </div>
    </Tabs>
  );
}
