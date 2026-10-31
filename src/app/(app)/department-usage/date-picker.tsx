"use client";

import { useRouter } from "next/navigation";

export function DatePicker({ date, departmentId }: { date: string; departmentId?: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      Date
      <input
        type="date"
        value={date}
        onChange={(e) => {
          if (!e.target.value) return;
          const dept = departmentId ? `&department=${departmentId}` : "";
          router.push(`/department-usage?date=${e.target.value}${dept}`);
        }}
        className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
      />
    </label>
  );
}
