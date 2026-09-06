"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./button";

/**
 * A button that opens a confirmation dialog collecting a required text reason,
 * then submits a form (whose `action` is a server action) with that reason
 * plus any hidden fields. Used for void/override actions that must never
 * fire without explicit operator confirmation + a recorded reason.
 *
 * On mobile the dialog is a bottom sheet (slides up from the bottom edge,
 * spans full width) so it's reachable with a thumb; on desktop it's a
 * centered modal.
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
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
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
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
          onClick={() => setOpen(false)}
        >
          <div
            ref={dialogRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-sm sm:rounded-lg"
          >
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {description && (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
            <form
              action={(formData) => {
                setOpen(false);
                action(formData);
              }}
              className="mt-4 space-y-3"
            >
              {Object.entries(hiddenFields).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <textarea
                name="reason"
                required
                rows={3}
                placeholder="Reason (required)"
                className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex flex-col-reverse gap-2 pb-[env(safe-area-inset-bottom)] sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setOpen(false)}
                  className="sm:size-sm"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="danger" size="md">
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
