import { Badge } from "@/components/ui/badge";
import type { Priority } from "@/lib/neon";

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge className={PRIORITY_STYLES[priority]} variant="outline">
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
