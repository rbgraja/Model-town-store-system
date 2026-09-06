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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
        {Icon && (
          <div className={cn("rounded-lg p-2", toneClass)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
