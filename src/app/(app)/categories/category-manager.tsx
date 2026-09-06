"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { createCategory, updateCategory } from "./actions";
import type { Category } from "@/lib/types/database";

// A short palette of pleasant, print-friendly fills — the user can still
// paste any 6-hex code they like into the text field.
const PALETTE = [
  "FEF3C7", "FDE68A", "FED7AA", "FECACA", "FCA5A5",
  "FBCFE8", "E9D5FF", "C7D2FE", "BAE6FD", "BBF7D0",
  "D9F99D", "FEF9C3", "E0F2FE", "F3F4F6", "E5E7EB",
];

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [colorHex, setColorHex] = useState("E5E7EB");
  const [sortOrder, setSortOrder] = useState(100);
  const [pending, startTransition] = useTransition();

  function resetForm() {
    setEditing(null);
    setName("");
    setColorHex("E5E7EB");
    setSortOrder(100);
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = editing
        ? await updateCategory(formData)
        : await createCategory(formData);
      if (result.ok) {
        toast.success(editing ? "Category updated" : "Category added");
        resetForm();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function toggleStatus(cat: Category) {
    const formData = new FormData();
    formData.set("id", cat.id);
    formData.set("name", cat.name);
    formData.set("color_hex", cat.color_hex);
    formData.set("sort_order", String(cat.sort_order));
    formData.set("status", cat.status === "active" ? "inactive" : "active");
    startTransition(async () => {
      const result = await updateCategory(formData);
      if (result.ok) {
        toast.success(
          cat.status === "active" ? "Category deactivated" : "Category activated"
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">
          {editing ? `Edit "${editing.name}"` : "Add Category"}
        </h2>
        <form action={submit} className="space-y-4">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          {editing && <input type="hidden" name="status" value={editing.status} />}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <Field label="Category Name" htmlFor="cat-name">
                <TextInput
                  id="cat-name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bread"
                  required
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Color (6-hex, no #)" htmlFor="cat-color">
                <TextInput
                  id="cat-color"
                  name="color_hex"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value.replace(/^#/, ""))}
                  placeholder="FDE68A"
                  maxLength={6}
                  required
                />
              </Field>
            </div>
            <div className="sm:col-span-1">
              <Field label="Sort" htmlFor="cat-sort">
                <TextInput
                  id="cat-sort"
                  name="sort_order"
                  type="number"
                  value={String(sortOrder)}
                  onChange={(e) => setSortOrder(Number(e.target.value) || 100)}
                  min={0}
                  max={9999}
                />
              </Field>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 mr-2">Palette:</span>
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => setColorHex(c)}
                className={`h-6 w-6 rounded border ${
                  colorHex.toUpperCase() === c ? "ring-2 ring-blue-500" : "border-gray-300"
                }`}
                style={{ backgroundColor: `#${c}` }}
              />
            ))}
            <span
              className="ml-2 rounded px-2 py-0.5 text-xs text-gray-700 border border-gray-200"
              style={{ backgroundColor: `#${colorHex}` }}
            >
              Preview
            </span>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {editing ? "Save Changes" : "Add Category"}
            </Button>
            {editing && (
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="table-scroll">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-3">Color</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Sort</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3">
                    <div
                      className="inline-block h-6 w-10 rounded border border-gray-300"
                      style={{ backgroundColor: `#${c.color_hex}` }}
                      title={`#${c.color_hex}`}
                    />
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-5 py-3 text-gray-500">{c.sort_order}</td>
                  <td className="px-5 py-3">
                    <Badge tone={c.status === "active" ? "green" : "gray"}>
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditing(c);
                          setName(c.name);
                          setColorHex(c.color_hex);
                          setSortOrder(c.sort_order);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant={c.status === "active" ? "secondary" : "primary"}
                        size="sm"
                        disabled={pending}
                        onClick={() => toggleStatus(c)}
                      >
                        {c.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">
                    No categories yet. Add your first one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
