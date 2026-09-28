"use client";

import Script from "next/script";
import { useLocale } from "next-intl";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
      getResponse: (id?: string) => string | undefined;
    };
  }
}

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export type TurnstileHandle = {
  /** Resolves with a token, waiting (up to `timeoutMs`) while the check is still running. */
  getToken: (timeoutMs?: number) => Promise<string | null>;
  reset: () => void;
};

/**
 * Cloudflare Turnstile spam check. Usually invisible; only shows a checkbox when Cloudflare
 * is unsure. Renders nothing when no site key is configured.
 */
export function Turnstile({ ref }: { ref?: Ref<TurnstileHandle> }) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const locale = useLocale();

  useImperativeHandle(ref, () => ({
    async getToken(timeoutMs = 10_000) {
      if (!siteKey) return null;
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const token = widgetId.current ? window.turnstile?.getResponse(widgetId.current) : undefined;
        if (token) return token;
        await new Promise((r) => setTimeout(r, 250));
      }
      return null;
    },
    reset() {
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
    },
  }));

  useEffect(() => {
    if (!siteKey) return;
    const timer = window.setInterval(() => {
      if (!window.turnstile || !container.current || widgetId.current) return;
      window.clearInterval(timer);
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: siteKey,
        language: locale,
        appearance: "interaction-only",
      });
    }, 200);
    return () => {
      window.clearInterval(timer);
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [locale]);

  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div ref={container} />
    </>
  );
}
