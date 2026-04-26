"use client";

import { useEffect, useState, useCallback } from "react";
import { Trash2, Copy, Check } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@multica/ui/components/ui/tooltip";
import type { PersonalAccessToken } from "@multica/core/types";
import { Input } from "@multica/ui/components/ui/input";
import { Button } from "@multica/ui/components/ui/button";
import { Card, CardContent } from "@multica/ui/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@multica/ui/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@multica/ui/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@multica/ui/components/ui/alert-dialog";
import { Skeleton } from "@multica/ui/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@multica/core/api";
import { SettingsSection } from "./settings-section";

export function TokensTab() {
  const [tokens, setTokens] = useState<PersonalAccessToken[]>([]);
  const [tokenName, setTokenName] = useState("");
  const [tokenExpiry, setTokenExpiry] = useState("90");
  const [tokenCreating, setTokenCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [tokenRevoking, setTokenRevoking] = useState<string | null>(null);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [tokensLoading, setTokensLoading] = useState(true);

  const loadTokens = useCallback(async () => {
    try {
      const list = await api.listPersonalAccessTokens();
      setTokens(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tokens konnten nicht geladen werden");
    } finally {
      setTokensLoading(false);
    }
  }, []);

  useEffect(() => { loadTokens(); }, [loadTokens]);

  const handleCreateToken = async () => {
    setTokenCreating(true);
    try {
      const expiresInDays = tokenExpiry === "never" ? undefined : Number(tokenExpiry);
      const result = await api.createPersonalAccessToken({ name: tokenName, expires_in_days: expiresInDays });
      setNewToken(result.token);
      setTokenName("");
      setTokenExpiry("90");
      await loadTokens();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Token konnte nicht erstellt werden");
    } finally {
      setTokenCreating(false);
    }
  };

  const handleRevokeToken = async (id: string) => {
    setTokenRevoking(id);
    try {
      await api.revokePersonalAccessToken(id);
      await loadTokens();
      toast.success("Token widerrufen");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Token konnte nicht widerrufen werden");
    } finally {
      setTokenRevoking(null);
    }
  };

  const handleCopyToken = async () => {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <SettingsSection heading="API-Tokens">
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Persönliche Zugriffstokens erlauben dem CLI und externen Integrationen, sich mit deinem Konto zu authentifizieren.
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
            <Input
              type="text"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="Token-Name (z. B. Mein CLI)"
            />
            <Select value={tokenExpiry} onValueChange={(v) => { if (v) setTokenExpiry(v); }}>
              <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 Tage</SelectItem>
                <SelectItem value="90">90 Tage</SelectItem>
                <SelectItem value="365">1 Jahr</SelectItem>
                <SelectItem value="never">Kein Ablauf</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCreateToken} disabled={tokenCreating || !tokenName.trim()}>
              {tokenCreating ? "Wird erstellt…" : "Erstellen"}
            </Button>
          </div>
        </div>
      </SettingsSection>

      {tokensLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-3">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tokens.length > 0 && (
        <div className="space-y-2">
          {tokens.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.token_prefix}... · Erstellt am {new Date(t.created_at).toLocaleDateString()} · {t.last_used_at ? `Zuletzt verwendet ${new Date(t.last_used_at).toLocaleDateString()}` : "Nie verwendet"}
                    {t.expires_at && ` · Läuft ab am ${new Date(t.expires_at).toLocaleDateString()}`}
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setRevokeConfirmId(t.id)}
                        disabled={tokenRevoking === t.id}
                        aria-label={`${t.name} widerrufen`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                  <TooltipContent>Widerrufen</TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!revokeConfirmId} onOpenChange={(v) => { if (!v) setRevokeConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Token widerrufen</AlertDialogTitle>
            <AlertDialogDescription>
              Dieser Token wird dauerhaft widerrufen und kann nicht mehr verwendet werden. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (revokeConfirmId) await handleRevokeToken(revokeConfirmId);
                setRevokeConfirmId(null);
              }}
            >
              Widerrufen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!newToken} onOpenChange={(v) => { if (!v) { setNewToken(null); setTokenCopied(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Token erstellt</DialogTitle>
            <DialogDescription>
              Kopiere deinen persönlichen Zugriffstoken jetzt. Du kannst ihn danach nicht mehr einsehen.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm break-all select-all">
              {newToken}
            </code>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="outline" size="icon" onClick={handleCopyToken}>
                    {tokenCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                }
              />
              <TooltipContent>Token kopieren</TooltipContent>
            </Tooltip>
          </div>
          <DialogFooter>
            <Button onClick={() => { setNewToken(null); setTokenCopied(false); }}>Fertig</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
