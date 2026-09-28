import { cn } from "@/lib/utils";
import { statusClasses, statusLabels } from "../_lib/format";

export function StatusBadge({ status }: { status: keyof typeof statusLabels }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", statusClasses[status])}>
      {statusLabels[status]}
    </span>
  );
}
