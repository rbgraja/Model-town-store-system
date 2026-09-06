"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./button";

/**
 * A button that opens a small modal collecting a required text reason, then
 * submits a form (whose `action` is a server action) with that reason plus
 * any hidden fields. Used for void/override actions that must never fire
 * without explicit operator confirmation + a recorded reason.
 */
export function ReasonModalForm({
  triggerLabel,
  triggerVariant = "danger",
  title,
  description,
  confirmLabel = "Confirm",
  action,
  hiddenFields,
}: {
  triggerLabel: string;
  triggerVariant?: "danger" | "secondary";
  title: string;
  description?: string;
  confirmLabel?: string;
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            ref={dialogRef}
            className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
          >
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {description && (
              <p className="mt-1 text-xs text-gray-500">{description}</p>
            )}
            <form
              action={(formData) => {
                setOpen(false);
                action(formData);
              }}
              className="mt-3 space-y-3"
            >
              {Object.entries(hiddenFields).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <textarea
                name="reason"
                required
                rows={3}
                placeholder="Reason (required)"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="danger" size="sm">
                  {confirmLabel}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
