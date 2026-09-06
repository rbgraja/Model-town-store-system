"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, SelectInput } from "@/components/ui/field";

export function ArchiveYearForm({ eligibleYears }: { eligibleYears: number[] }) {
  const router = useRouter();
  const [year, setYear] = useState<number | undefined>(eligibleYears[0]);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function runArchive() {
    if (!year) return;
    setPending(true);
    try {
      const res = await fetch("/api/archives/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Unable to archive year");
      } else {
        toast.success(
          `Year ${year} archived — ${json.incomingArchived} incoming and ${json.outgoingArchived} outgoing entries moved.`
        );
        router.refresh();
      }
    } catch {
      toast.error("Unable to archive year");
    } finally {
      setPending(false);
      setConfirming(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Archive Year"
        description="Generates the yearly XLSX, uploads it to storage, and only then moves that year's detailed records out of the active tables."
      />
      <CardBody className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Field label="Year" htmlFor="archive-year">
            <SelectInput
              id="archive-year"
              value={year ?? ""}
              onChange={(e) => setYear(Number(e.target.value))}
              disabled={eligibleYears.length === 0}
            >
              {eligibleYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        {!confirming ? (
          <Button
            variant="danger"
            disabled={!year || pending || eligibleYears.length === 0}
            onClick={() => setConfirming(true)}
          >
            <Archive className="h-4 w-4" /> Archive Year
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Archive {year}? This cannot be undone.
            </span>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="danger" onClick={runArchive} disabled={pending}>
              {pending ? "Archiving..." : "Yes, Archive"}
            </Button>
          </div>
        )}

        {eligibleYears.length === 0 && (
          <p className="text-xs text-gray-400">No fully-ended, unarchived years available yet.</p>
        )}
      </CardBody>
    </Card>
  );
}
