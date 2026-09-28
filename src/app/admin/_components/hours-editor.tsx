"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { minutesToTime, timeToMinutes, weekdayNames } from "../_lib/format";

export type HoursRow = { weekday: number; openMinute: number; closeMinute: number };

/** Weekly opening hours: one row per weekday, tick the working days and set the times. */
export function HoursEditor({ value, onChange }: { value: HoursRow[]; onChange: (rows: HoursRow[]) => void }) {
  const field = "h-9 rounded-md border bg-background px-2 text-sm tabular-nums disabled:opacity-40";
  return (
    <table className="w-full max-w-lg text-sm">
      <tbody>
        {[1, 2, 3, 4, 5, 6, 7].map((weekday) => {
          const row = value.find((r) => r.weekday === weekday);
          const set = (patch: Partial<HoursRow>) =>
            onChange(value.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));
          return (
            <tr key={weekday}>
              <td className="py-1.5 pr-3">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={!!row}
                    onCheckedChange={(on) =>
                      onChange(
                        on
                          ? [...value, { weekday, openMinute: 8 * 60, closeMinute: 18 * 60 }].sort((a, b) => a.weekday - b.weekday)
                          : value.filter((r) => r.weekday !== weekday),
                      )
                    }
                  />
                  {weekdayNames[weekday]}
                </label>
              </td>
              <td className="py-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    step={900}
                    aria-label={`${weekdayNames[weekday]} от`}
                    disabled={!row}
                    value={row ? minutesToTime(row.openMinute) : ""}
                    onChange={(e) => e.target.value && set({ openMinute: timeToMinutes(e.target.value) })}
                    className={field}
                  />
                  –
                  <input
                    type="time"
                    step={900}
                    aria-label={`${weekdayNames[weekday]} до`}
                    disabled={!row}
                    value={row ? minutesToTime(row.closeMinute) : ""}
                    onChange={(e) => e.target.value && set({ closeMinute: timeToMinutes(e.target.value) })}
                    className={field}
                  />
                  {!row && <span className="text-muted-foreground">почивен</span>}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
