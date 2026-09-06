import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "negative" | "warning";
}) {
  const toneClass = {
    default: "bg-blue-50 text-blue-600",
    positive: "bg-emerald-50 text-emerald-600",
    negative: "bg-red-50 text-red-600",
    warning: "bg-amber-50 text-amber-600",
  }[tone];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">
            {label}
          </p>
          <p className="mt-1.5 text-lg font-semibold text-gray-900 sm:mt-2 sm:text-2xl">
            {value}
          </p>
          {sub && <p className="mt-1 truncate text-xs text-gray-500">{sub}</p>}
        </div>
        {Icon && (
          <div className={cn("shrink-0 rounded-lg p-2", toneClass)}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
