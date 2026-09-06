"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { SelectInput, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function FilterBar({
  basePath,
  products,
  departments,
}: {
  basePath: string;
  products: { id: string; name: string }[];
  departments?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${basePath}?${params.toString()}`);
  }

  function clearAll() {
    router.push(basePath);
  }

  const activeCount = ["product", "department", "from", "to"].filter((k) =>
    searchParams.get(k)
  ).length;

  const body = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:flex md:flex-wrap md:items-end">
      <div className="w-full md:w-52">
        <label className="mb-1 block text-xs font-medium text-gray-500">
          Product
        </label>
        <SelectInput
          value={searchParams.get("product") ?? ""}
          onChange={(e) => update("product", e.target.value)}
        >
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectInput>
      </div>

      {departments && (
        <div className="w-full md:w-52">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Department
          </label>
          <SelectInput
            value={searchParams.get("department") ?? ""}
            onChange={(e) => update("department", e.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </SelectInput>
        </div>
      )}

      <div className="w-full md:w-auto">
        <label className="mb-1 block text-xs font-medium text-gray-500">
          From
        </label>
        <TextInput
          type="date"
          value={searchParams.get("from") ?? ""}
          onChange={(e) => update("from", e.target.value)}
        />
      </div>

      <div className="w-full md:w-auto">
        <label className="mb-1 block text-xs font-medium text-gray-500">
          To
        </label>
        <TextInput
          type="date"
          value={searchParams.get("to") ?? ""}
          onChange={(e) => update("to", e.target.value)}
        />
      </div>

      {activeCount > 0 && (
        <div className="w-full sm:col-span-2 md:w-auto">
          <Button variant="ghost" size="sm" onClick={clearAll} className="w-full md:w-auto">
            <X className="h-3.5 w-3.5" />
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Mobile: collapsible header */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-700 md:hidden"
        aria-expanded={mobileOpen}
      >
        <span className="flex items-center gap-2">
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {activeCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${
            mobileOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div className={`${mobileOpen ? "block" : "hidden"} border-t border-gray-100 p-4 md:block md:border-t-0`}>
        {body}
      </div>
    </div>
  );
}
