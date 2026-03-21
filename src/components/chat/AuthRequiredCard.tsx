"use client";

import { Lock } from "lucide-react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface AuthRequiredCardProps {
  reason: string;
}

export function AuthRequiredCard({ reason }: AuthRequiredCardProps) {
  const { t } = useSiteI18n();
  const { loading, openAuthModal } = useAuth();

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
          <Lock className="h-4 w-4" />
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {reason || t("chat.authRequired.fallbackReason")}
          </p>
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={() => openAuthModal({ mode: "login" })}
          >
            {t("chat.authRequired.login")}
          </Button>
        </div>
      </div>
    </div>
  );
}
