"use client";

import { Bot, Loader2, MessageSquareText, RotateCcw, SendHorizontal, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Turnstile, type TurnstileHandle } from "@/components/booking/turnstile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@/i18n/navigation";
import { contactRequestSchema, parseContact } from "@/lib/contact-schema";
import { formatPhone, site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { submitContactRequest } from "@/server/actions/contact";

type Step = "name" | "contact" | "second" | "description" | "confirm" | "done";
type Message = { id: number; from: "bot" | "user"; content: ReactNode };
type Answers = { name: string; phone: string; email: string; description: string };

const empty: Answers = { name: "", phone: "", email: "", description: "" };
let nextId = 0;

/**
 * Scripted chat bot that works as a contact form: asks for a name, a phone or email and a short
 * description of the job, then saves the request and emails the office.
 */
export function ChatWidget() {
  const t = useTranslations("chat");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("name");
  const [answers, setAnswers] = useState<Answers>(empty);
  const greeting = () =>
    [t("greeting"), t("intro"), t("askName")].map((content) => ({ id: nextId++, from: "bot" as const, content }));
  const [messages, setMessages] = useState<Message[]>(greeting);
  const [draft, setDraft] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  const bot = (...content: ReactNode[]) =>
    setMessages((m) => [...m, ...content.map((c) => ({ id: nextId++, from: "bot" as const, content: c }))]);
  const user = (content: ReactNode) => setMessages((m) => [...m, { id: nextId++, from: "user", content }]);

  const start = () => {
    setStep("name");
    setAnswers(empty);
    setConsent(false);
    setDraft("");
    setMessages(greeting());
  };

  // Closing only hides the panel, so the conversation continues where the visitor left off.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, step]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const askDescription = () => {
    setStep("description");
    bot(t("askDescription"));
  };

  const answer = (e?: { preventDefault: () => void }) => {
    e?.preventDefault();
    const value = draft.trim();
    if (!value) return;
    setDraft("");
    user(value);

    if (step === "name") {
      if (value.length < 2 || value.length > 100) return bot(t("errors.nameRequired"));
      setAnswers((a) => ({ ...a, name: value }));
      setStep("contact");
      bot(t("askContact", { name: value }));
    } else if (step === "contact" || step === "second") {
      const contact = parseContact(value);
      if (!contact) return bot(t("errors.contactInvalid"));
      const next = { ...answers, ...contact };
      setAnswers(next);
      if (step === "contact") {
        setStep("second");
        bot(t("askSecond", { other: "phone" in contact ? t("otherEmail") : t("otherPhone") }));
      } else askDescription();
    } else if (step === "description") {
      if (value.length < 10) return bot(t("errors.descriptionRequired"));
      if (value.length > 2000) return bot(t("errors.tooLong"));
      setAnswers((a) => ({ ...a, description: value }));
      setStep("confirm");
      bot(t("confirm"));
    }
  };

  const skip = () => {
    user(t("skip"));
    askDescription();
  };

  const send = () =>
    startTransition(async () => {
      const input = {
        ...answers,
        locale,
        pageUrl: window.location.pathname,
        consent,
      };
      const local = contactRequestSchema.safeParse(input);
      if (!local.success) {
        const code = local.error.issues[0]?.message;
        return bot(t.has(`errors.${code}`) ? t(`errors.${code}` as "errors.generic") : t("errors.invalid"));
      }
      const result = await submitContactRequest({
        ...input,
        website: honeypotRef.current?.value,
        turnstileToken: await turnstileRef.current?.getToken(),
      });
      turnstileRef.current?.reset(); // a token can only be used once
      if (result.ok) {
        setStep("done");
        bot(t("done"), t("urgent", { phone: formatPhone(site.phone) }));
      } else {
        bot(t(`errors.${result.error}`));
      }
    });

  const awaitingText = step === "name" || step === "contact" || step === "second" || step === "description";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="chat-panel"
        aria-label={open ? t("close") : t("open")}
        className="bg-foreground text-background focus-visible:ring-ring/40 flex h-12 items-center gap-2 rounded-full px-4 font-semibold shadow-lg transition hover:scale-105 focus-visible:ring-4 focus-visible:outline-none"
      >
        {open ? <X className="size-5" aria-hidden /> : <MessageSquareText className="size-5" aria-hidden />}
        <span>{t("button")}</span>
      </button>

      <section
        id="chat-panel"
        role="dialog"
        aria-label={t("title")}
        hidden={!open}
        className="bg-background fixed right-4 bottom-4 z-50 flex h-[min(36rem,calc(100dvh-2rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl"
      >
        <header className="bg-primary text-primary-foreground flex items-center gap-3 px-4 py-3">
          <span className="bg-primary-foreground/15 grid size-9 place-items-center rounded-full">
            <Bot className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t("title")}</p>
            <p className="truncate text-xs opacity-85">{t("subtitle")}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
            onClick={() => setOpen(false)}
            aria-label={t("close")}
          >
            <X className="size-5" aria-hidden />
          </Button>
        </header>

        <div className="bg-muted/40 flex-1 overflow-y-auto p-4" aria-live="polite">
          <div className="grid gap-2.5">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.from === "user" && "justify-end")}>
                <p
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap",
                    m.from === "bot"
                      ? "bg-card rounded-bl-sm shadow-sm"
                      : "bg-primary text-primary-foreground rounded-br-sm font-medium",
                  )}
                >
                  {m.content}
                </p>
              </div>
            ))}

            {step === "second" && (
              <Button variant="outline" size="sm" className="justify-self-end rounded-full" onClick={skip}>
                {t("skip")}
              </Button>
            )}

            {step === "confirm" && (
              <div className="bg-card grid gap-3 rounded-2xl p-4 text-sm shadow-sm">
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                  <dt className="text-muted-foreground">{t("name")}</dt>
                  <dd className="font-medium break-words">{answers.name}</dd>
                  {answers.phone && (
                    <>
                      <dt className="text-muted-foreground">{t("phone")}</dt>
                      <dd className="font-medium">{formatPhone(answers.phone)}</dd>
                    </>
                  )}
                  {answers.email && (
                    <>
                      <dt className="text-muted-foreground">{t("email")}</dt>
                      <dd className="font-medium break-all">{answers.email}</dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">{t("description")}</dt>
                  <dd className="break-words whitespace-pre-wrap">{answers.description}</dd>
                </dl>
                <label className="flex items-start gap-2 leading-snug">
                  <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                  <span>
                    {t.rich("consent", {
                      link: (chunks) => (
                        <Link href="/privacy" className="underline" target="_blank">
                          {chunks}
                        </Link>
                      ),
                    })}
                  </span>
                </label>
                <div className="hidden" aria-hidden>
                  <input ref={honeypotRef} name="website" tabIndex={-1} autoComplete="off" />
                </div>
                <Turnstile ref={turnstileRef} />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={send} disabled={pending || !consent}>
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <SendHorizontal className="size-4" aria-hidden />
                    )}
                    {pending ? t("sending") : t("send")}
                  </Button>
                  <Button variant="ghost" onClick={start} disabled={pending}>
                    <RotateCcw className="size-4" aria-hidden />
                    {t("edit")}
                  </Button>
                </div>
              </div>
            )}

            {step === "done" && (
              <Button variant="outline" size="sm" className="justify-self-start rounded-full" onClick={start}>
                <RotateCcw className="size-4" aria-hidden />
                {t("newRequest")}
              </Button>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {awaitingText && (
          <form onSubmit={answer} className="bg-background flex items-end gap-2 border-t p-3">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) answer(e);
              }}
              rows={step === "description" ? 3 : 1}
              maxLength={2000}
              placeholder={step === "contact" || step === "second" ? t("placeholderContact") : t("placeholder")}
              aria-label={t("placeholder")}
              autoComplete={step === "name" ? "name" : "off"}
              className="bg-background focus-visible:ring-ring/50 max-h-32 min-h-10 flex-1 resize-none rounded-xl border px-3 py-2 text-base outline-none focus-visible:ring-2 sm:text-sm"
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-full"
              aria-label={t("submitAnswer")}
              disabled={!draft.trim()}
            >
              <SendHorizontal className="size-4" aria-hidden />
            </Button>
          </form>
        )}
      </section>
    </>
  );
}
