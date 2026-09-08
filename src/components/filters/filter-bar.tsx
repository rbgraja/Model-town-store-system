"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";
import { SelectInput, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function FilterBar({
  basePath,
  products,
  departments,
  categories,
}: {
  basePath: string;
  products: { id: string; name: string }[];
  departments?: { id: string; name: string }[];
  /** Optional — only the Outgoing list passes this. Turns on the Category,
   * Stock status and Search filters alongside the ones above. These are
   * plain URL search params like the rest of this bar: optional, combine
   * freely, and are never a permanent/sticky preference — "Clear filters"
   * (or just navigating away) always returns to "All Categories" / "All". */
  categories?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${basePath}?${params.toString()}`);
  }

  // Debounce the free-text search so every keystroke doesn't push a new URL
  // (and re-run the server-side query) — 350ms after the user stops typing.
  useEffect(() => {
    if (!categories) return;
    const current = searchParams.get("q") ?? "";
    if (q === current) return;
    const timer = setTimeout(() => update("q", q), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function clearAll() {
    setQ("");
    router.push(basePath);
  }

  const activeCount = ["product", "department", "from", "to", "category", "stock", "q"].filter(
    (k) => searchParams.get(k)
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

      {categories && (
        <>
          <div className="w-full md:w-52">
            <label className="mb-1 block text-xs font-medium text-gray-500">Category</label>
            <SelectInput
              value={searchParams.get("category") ?? ""}
              onChange={(e) => update("category", e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="__none__">— Uncategorized —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectInput>
          </div>

          <div className="w-full md:w-44">
            <label className="mb-1 block text-xs font-medium text-gray-500">Stock</label>
            <SelectInput
              value={searchParams.get("stock") ?? ""}
              onChange={(e) => update("stock", e.target.value)}
            >
              <option value="">All</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </SelectInput>
          </div>

          <div className="relative w-full md:w-56">
            <label className="mb-1 block text-xs font-medium text-gray-500">Search</label>
            <Search className="pointer-events-none absolute left-3 top-[calc(50%+0.5rem)] h-4 w-4 -translate-y-1/2 text-gray-400" />
            <TextInput
              placeholder="Search product…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
        </>
      )}

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
