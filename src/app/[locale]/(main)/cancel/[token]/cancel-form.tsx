"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelBooking } from "@/server/actions/cancel";

export function CancelForm({ token }: { token: string }) {
  const t = useTranslations("cancel");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  if (status) {
    const key =
      status === "cancelled"
        ? "cancelled"
        : status === "already-cancelled"
          ? "alreadyCancelled"
          : status === "too-late"
            ? "tooLate"
            : "notFound";
    return (
      <p role="status" className="rounded-lg bg-muted p-4 font-medium">
        {t(key)}
      </p>
    );
  }

  return (
    <Button
      variant="destructive"
      size="lg"
      disabled={pending}
      onClick={() => startTransition(async () => setStatus((await cancelBooking(token)).status))}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {t("confirm")}
    </Button>
  );
}
