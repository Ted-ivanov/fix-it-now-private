import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-bold tracking-tight whitespace-nowrap", className)}>
      <span
        className={cn(
          "grid size-8 place-items-center rounded-lg",
          inverted ? "bg-white text-primary" : "bg-primary text-primary-foreground",
        )}
      >
        <Wrench className="size-4.5" aria-hidden />
      </span>
      <span className="text-lg">
        Fix It <span className={inverted ? "text-white" : "text-primary"}>Now</span>
      </span>
    </span>
  );
}
