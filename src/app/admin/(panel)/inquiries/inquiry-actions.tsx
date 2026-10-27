"use client";

import { Check, RotateCcw, Trash2 } from "lucide-react";
import { useTransition } from "react";
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
import { deleteContactRequestAction, setContactRequestHandledAction } from "@/server/actions/admin";

export function InquiryActions({ id, handled }: { id: string; handled: boolean }) {
  const [pending, startTransition] = useTransition();
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error ?? "Грешка");
    });

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant={handled ? "outline" : "default"}
        disabled={pending}
        onClick={() => act(() => setContactRequestHandledAction(id, !handled))}
      >
        {handled ? <RotateCcw className="size-4" aria-hidden /> : <Check className="size-4" aria-hidden />}
        {handled ? "Върни като необработено" : "Обработено"}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="ghost" disabled={pending}>
            <Trash2 className="size-4" aria-hidden />
            Изтрий
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Изтриване на запитването?</AlertDialogTitle>
            <AlertDialogDescription>Данните на клиента ще бъдат премахнати окончателно.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отказ</AlertDialogCancel>
            <AlertDialogAction onClick={() => act(() => deleteContactRequestAction(id))}>Изтрий</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
