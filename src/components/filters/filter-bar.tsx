"use client";

import { useRouter, useSearchParams } from "next/navigation";
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

  const hasFilters = ["product", "department", "from", "to"].some((k) =>
    searchParams.get(k)
  );

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="w-52">
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
        <div className="w-52">
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

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">
          From
        </label>
        <TextInput
          type="date"
          value={searchParams.get("from") ?? ""}
          onChange={(e) => update("from", e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">
          To
        </label>
        <TextInput
          type="date"
          value={searchParams.get("to") ?? ""}
          onChange={(e) => update("to", e.target.value)}
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
