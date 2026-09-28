"use client";

import { VisitTypePicker } from "@/components/booking/visit-type-picker";
import { useRouter } from "@/i18n/navigation";

export function VisitChoice({
  slug,
  durations,
}: {
  slug: string;
  durations: { inspection: number | null; repair: number | null };
}) {
  const router = useRouter();
  return (
    <VisitTypePicker
      durations={durations}
      onChoose={(type) =>
        router.push({
          pathname: "/services/[category]/book",
          params: { category: slug },
          // "ack" records that the extra-charge notice was accepted for a repair visit.
          query: type === "repair" ? { type, ack: "1" } : { type },
        })
      }
    />
  );
}
