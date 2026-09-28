import { Droplets, Hammer, PaintRoller, Wrench, Zap, type LucideProps } from "lucide-react";

const icons = {
  zap: Zap,
  droplets: Droplets,
  "paint-roller": PaintRoller,
  wrench: Wrench,
  hammer: Hammer,
} as const;

export const categoryIconNames = Object.keys(icons) as (keyof typeof icons)[];

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = icons[name as keyof typeof icons] ?? Wrench;
  return <Icon aria-hidden {...props} />;
}
