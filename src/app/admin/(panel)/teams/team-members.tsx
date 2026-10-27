"use client";

import { CalendarCheck, CalendarX, Copy, Link2, Loader2, Plus, Trash2, Unlink } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createConnectLinkAction,
  createMemberAction,
  deleteMemberAction,
  disconnectGoogleAction,
  updateMemberAction,
} from "@/server/actions/admin";

type Reminder = { method: "popup" | "email"; minutes: number };

export type MemberView = {
  id: string;
  name: string;
  email: string | null;
  reminders: Reminder[];
  connected: boolean;
  googleEmail: string | null;
  googleConnectedAt: string | null;
  googleError: string | null;
};

const field = "h-9 rounded-md border bg-background px-2 text-sm";
const UNITS = [
  { value: 1, label: "минути" },
  { value: 60, label: "часа" },
  { value: 1440, label: "дни" },
] as const;

/** 1440 → { amount: 1, unit: 1440 } so the editor shows "1 дни" rather than "1440 минути". */
function split(minutes: number) {
  const unit = [...UNITS].reverse().find((u) => minutes > 0 && minutes % u.value === 0)?.value ?? 1;
  return { amount: minutes / unit, unit };
}

function RemindersEditor({ value, onChange }: { value: Reminder[]; onChange: (v: Reminder[]) => void }) {
  const set = (i: number, patch: Partial<Reminder>) =>
    onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="grid gap-2">
      {value.length === 0 && <p className="text-muted-foreground text-sm">Без напомняния.</p>}
      {value.map((r, i) => {
        const { amount, unit } = split(r.minutes);
        return (
          <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="number"
              min={0}
              max={Math.floor(40320 / unit)}
              aria-label="Колко време преди"
              value={amount}
              onChange={(e) => set(i, { minutes: Math.max(0, Number(e.target.value) || 0) * unit })}
              className={`${field} w-20 tabular-nums`}
            />
            <select
              aria-label="Единица"
              value={unit}
              onChange={(e) => set(i, { minutes: amount * Number(e.target.value) })}
              className={field}
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
            <span>преди, като</span>
            <select
              aria-label="Вид напомняне"
              value={r.method}
              onChange={(e) => set(i, { method: e.target.value as Reminder["method"] })}
              className={field}
            >
              <option value="popup">известие на телефона</option>
              <option value="email">имейл</option>
            </select>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Премахни напомнянето"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        );
      })}
      {value.length < 5 && (
        <Button
          variant="outline"
          size="sm"
          className="justify-self-start"
          onClick={() => onChange([...value, { method: "popup", minutes: 60 }])}
        >
          <Plus className="size-4" aria-hidden />
          Добави напомняне
        </Button>
      )}
    </div>
  );
}

function ConnectionStatus({ member }: { member: MemberView }) {
  if (member.connected) {
    return (
      <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
        <CalendarCheck className="size-4 shrink-0" aria-hidden />
        Свързан с Google Calendar на {member.googleEmail}
        {member.googleConnectedAt && (
          <span className="text-muted-foreground">
            {" "}
            от {new Date(member.googleConnectedAt).toLocaleDateString("bg-BG")}
          </span>
        )}
      </p>
    );
  }
  return (
    <p className="text-muted-foreground flex items-center gap-2 text-sm">
      <CalendarX className="size-4 shrink-0" aria-hidden />
      Google Calendar не е свързан
    </p>
  );
}

function MemberCard({ member, googleConfigured }: { member: MemberView; googleConfigured: boolean }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email ?? "");
  const [reminders, setReminders] = useState(member.reminders);
  const [link, setLink] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) toast.success(success);
      else toast.error(r.error ?? "Грешка");
    });

  return (
    <li className="grid gap-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`member-name-${member.id}`}>Име</Label>
          <Input
            id={`member-name-${member.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-52"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`member-email-${member.id}`}>Google акаунт (по желание)</Label>
          <Input
            id={`member-email-${member.id}`}
            type="email"
            value={email}
            placeholder="ivan@gmail.com"
            onChange={(e) => setEmail(e.target.value)}
            className="w-64"
          />
        </div>
      </div>
      <p className="text-muted-foreground -mt-2 text-xs">
        Ако попълните имейл, само този Google акаунт може да бъде свързан.
      </p>

      <div className="grid gap-2">
        <p className="text-sm font-medium">Напомняния в Google Calendar</p>
        <RemindersEditor value={reminders} onChange={setReminders} />
      </div>

      <div className="grid gap-2">
        <ConnectionStatus member={member} />
        {member.googleError && <p className="text-destructive text-sm">{member.googleError}</p>}
      </div>

      {link && (
        <div className="bg-muted grid gap-1.5 rounded-md p-3">
          <Label htmlFor={`member-link-${member.id}`}>Линк за {member.name}</Label>
          <div className="flex gap-2">
            <Input id={`member-link-${member.id}`} readOnly value={link} onFocus={(e) => e.target.select()} />
            <Button
              variant="secondary"
              onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Линкът е копиран."))}
            >
              <Copy className="size-4" aria-hidden />
              Копирай
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Изпратете го на {member.name} (напр. по Viber). Работи еднократно и е валиден 72 часа. Човекът влиза със
            своя Google акаунт и натиска „Разрешаване“. Ако Google покаже „Приложението не е потвърдено“, изберете
            „Разширени“ → „Продължаване“.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending || !name.trim()}
          onClick={() => run(() => updateMemberAction(member.id, { name, email, reminders }), "Запазено.")}
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Запази
        </Button>
        {googleConfigured && (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await createConnectLinkAction(member.id);
                setLink(r.url);
              })
            }
          >
            <Link2 className="size-4" aria-hidden />
            {member.connected ? "Нов линк за свързване" : "Линк за свързване с Google"}
          </Button>
        )}
        {member.connected && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (
                !confirm(
                  `Да прекъснем ли връзката с календара на ${member.name}? Бъдещите посещения ще бъдат премахнати от него.`,
                )
              )
                return;
              run(() => disconnectGoogleAction(member.id), "Връзката е прекъсната.");
            }}
          >
            <Unlink className="size-4" aria-hidden />
            Прекъсни връзката
          </Button>
        )}
        <Button
          variant="ghost"
          className="text-destructive"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Да изтрием ли ${member.name}?`)) return;
            run(() => deleteMemberAction(member.id), "Изтрито.");
          }}
        >
          <Trash2 className="size-4" aria-hidden />
          Изтрий
        </Button>
      </div>
    </li>
  );
}

export function TeamMembers({
  teamId,
  members,
  googleConfigured,
}: {
  teamId: string;
  members: MemberView[];
  googleConfigured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <div className="grid gap-4">
      {!googleConfigured && (
        <p className="bg-muted text-muted-foreground rounded-md p-3 text-sm">
          Google Calendar още не е настроен (липсват GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET). Можете да добавяте
          членове, а свързването ще се появи след настройката.
        </p>
      )}
      {members.length > 0 && (
        <ul className="grid gap-3">
          {members.map((m) => (
            <MemberCard key={m.id} member={m} googleConfigured={googleConfigured} />
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`new-member-${teamId}`}>Нов член</Label>
          <Input
            id={`new-member-${teamId}`}
            value={name}
            placeholder="Име"
            onChange={(e) => setName(e.target.value)}
            className="w-52"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`new-member-email-${teamId}`}>Google акаунт (по желание)</Label>
          <Input
            id={`new-member-email-${teamId}`}
            type="email"
            value={email}
            placeholder="ivan@gmail.com"
            onChange={(e) => setEmail(e.target.value)}
            className="w-64"
          />
        </div>
        <Button
          variant="secondary"
          disabled={pending || !name.trim()}
          onClick={() =>
            startTransition(async () => {
              const r = await createMemberAction(teamId, { name, email });
              if (!r.ok) return void toast.error(r.error);
              toast.success("Членът е добавен.");
              setName("");
              setEmail("");
            })
          }
        >
          <Plus className="size-4" aria-hidden />
          Добави
        </Button>
      </div>
    </div>
  );
}
