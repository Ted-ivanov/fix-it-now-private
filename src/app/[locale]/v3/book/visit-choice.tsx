"use client";

import { VisitTypePicker } from "@/components/booking/visit-type-picker";
import { useRouter } from "@/i18n/navigation";

export function V3VisitChoice({
  category,
  durations,
}: {
  category: string;
  durations: { inspection: number | null; repair: number | null };
}) {
  const router = useRouter();
  return (
    <VisitTypePicker
      durations={durations}
      onChoose={(type) =>
        router.push({
          pathname: "/v3/book",
          query: type === "repair" ? { category, type, ack: "1" } : { category, type },
        })
      }
    />
  );
}
