"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { createDepartment, updateDepartment } from "./actions";
import type { Department } from "@/lib/types/database";

export function DepartmentManager({
  departments,
}: {
  departments: Department[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function resetForm() {
    setEditing(null);
    setName("");
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = editing
        ? await updateDepartment(formData)
        : await createDepartment(formData);

      if (result.ok) {
        toast.success(editing ? "Department updated" : "Department added");
        resetForm();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function toggleStatus(dept: Department) {
    const formData = new FormData();
    formData.set("id", dept.id);
    formData.set("name", dept.name);
    formData.set("status", dept.status === "active" ? "inactive" : "active");
    startTransition(async () => {
      const result = await updateDepartment(formData);
      if (result.ok) {
        toast.success(
          dept.status === "active" ? "Department deactivated" : "Department activated"
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
          {editing ? `Edit "${editing.name}"` : "Add Department"}
        </h2>
        <form
          action={submit}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          {editing && <input type="hidden" name="id" value={editing.id} />}
          {editing && (
            <input type="hidden" name="status" value={editing.status} />
          )}
          <div className="flex-1">
            <Field label="Department Name" htmlFor="dept-name">
              <TextInput
                id="dept-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kitchen"
                required
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {editing ? "Save Changes" : "Add Department"}
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
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departments.map((d) => (
                <tr key={d.id}>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {d.name}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={d.status === "active" ? "green" : "gray"}>
                      {d.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {formatDate(d.created_at)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditing(d);
                          setName(d.name);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant={d.status === "active" ? "secondary" : "primary"}
                        size="sm"
                        disabled={pending}
                        onClick={() => toggleStatus(d)}
                      >
                        {d.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-sm text-gray-400"
                  >
                    No departments yet. Add your first one above.
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
