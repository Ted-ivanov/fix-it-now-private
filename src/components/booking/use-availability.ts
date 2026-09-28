"use client";

import { useEffect, useState } from "react";
import type { VisitType } from "./visit-type-picker";

export type SlotOption = { start: string; label: string };

type Loaded<T> = { key: string; data: T | null; error: boolean };

/** Fetches JSON for `url`; state only changes when a response arrives, loading is derived. */
function useJson<T>(url: string | null, reloadKey = 0) {
  const key = url ? `${url}#${reloadKey}` : null;
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);

  useEffect(() => {
    if (!url || !key) return;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error(String(r.status)))))
      .then((data) => setLoaded({ key, data, error: false }))
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setLoaded({ key, data: null, error: true });
      });
    return () => controller.abort();
  }, [url, key]);

  const current = loaded?.key === key ? loaded : null;
  return { data: current?.data ?? null, loading: !!key && !current, error: current?.error ?? false };
}

/** Days with free slots in a month ("YYYY-MM"). */
export function useBookableDays(categoryId: string, type: VisitType, month: string) {
  const url = `/api/availability/days?${new URLSearchParams({ category: categoryId, type, month })}`;
  const state = useJson<{ days: string[] }>(url);
  return { ...state, days: state.data?.days ?? [] };
}

/** Free start times on a day ("YYYY-MM-DD"). */
export function useSlots(categoryId: string, type: VisitType, day: string | null, reloadKey = 0) {
  const url = day ? `/api/availability/slots?${new URLSearchParams({ category: categoryId, type, day })}` : null;
  const state = useJson<{ slots: SlotOption[] }>(url, reloadKey);
  return { ...state, slots: state.data?.slots ?? [] };
}

export function toDayString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function toMonthString(date: Date) {
  return toDayString(date).slice(0, 7);
}

export function fromDayString(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}
