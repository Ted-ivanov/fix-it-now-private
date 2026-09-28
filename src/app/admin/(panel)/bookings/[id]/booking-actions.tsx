"use client";

import { Check, CheckCheck, Loader2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { setBookingNoteAction, setBookingStatusAction } from "@/server/actions/admin";

type Status = "pending" | "confirmed" | "done" | "cancelled";

export function BookingActions({ id, status, note }: { id: string; status: Status; note: string }) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(note);

  const setStatus = (next: Status) =>
    startTransition(async () => {
      const r = await setBookingStatusAction(id, next);
      if (r.ok) toast.success("Статусът е обновен.");
      else toast.error(r.error);
    });

  return (
    <section className="grid gap-4 rounded-xl border bg-background p-5">
      <h2 className="font-semibold">Действия</h2>
      <div className="grid gap-2">
        {status === "pending" && (
          <Button onClick={() => setStatus("confirmed")} disabled={pending}>
            <Check className="size-4" aria-hidden />
            Потвърди
          </Button>
        )}
        {(status === "pending" || status === "confirmed") && (
          <Button variant="secondary" onClick={() => setStatus("done")} disabled={pending}>
            <CheckCheck className="size-4" aria-hidden />
            Отбележи като изпълнена
          </Button>
        )}
        {status !== "cancelled" && status !== "done" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive" disabled={pending}>
                <X className="size-4" aria-hidden />
                Откажи посещението
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Да откажем ли посещението?</AlertDialogTitle>
                <AlertDialogDescription>
                  Часът ще се освободи веднага и клиентът ще получи имейл, че посещението е отказано.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Назад</AlertDialogCancel>
                <AlertDialogAction onClick={() => setStatus("cancelled")}>Откажи</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {pending && <Loader2 className="mx-auto size-4 animate-spin" aria-label="Запазване" />}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="note">Вътрешна бележка</Label>
        <Textarea id="note" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Button
          variant="outline"
          size="sm"
          disabled={pending || draft === note}
          onClick={() =>
            startTransition(async () => {
              const r = await setBookingNoteAction(id, draft);
              if (r.ok) toast.success("Бележката е запазена.");
              else toast.error(r.error);
            })
          }
        >
          Запази бележката
        </Button>
      </div>
    </section>
  );
}
