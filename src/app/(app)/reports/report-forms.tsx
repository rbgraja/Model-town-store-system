"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { monthName, todayISODate } from "@/lib/utils";

async function downloadReport(url: string, fallbackName: string) {
  const res = await fetch(url);
  if (!res.ok) {
    let message = "Unable to generate report";
    try {
      const json = await res.json();
      message = json.error ?? message;
    } catch {
      // ignore parse errors, use fallback message
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const fileName = match?.[1] ?? fallbackName;

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function MonthlyReportForm() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [pending, setPending] = useState(false);

  async function handleGenerate(scope: string) {
    setPending(true);
    try {
      await downloadReport(
        `/api/reports/monthly?month=${month}&year=${year}&scope=${scope}`,
        `Store_Report_${monthName(month)}_${year}_${scope}.${scope === "zip" ? "zip" : "xlsx"}`
      );
      toast.success("Report generated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to generate report");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Monthly Report"
        description="3 Excel files: Kitchen + Grocery Store + Bakery ek mein, baaki departments ek mein, aur Total. Ek ZIP mein ya alag alag."
      />
      <CardBody className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Field label="Month" htmlFor="report-month">
            <SelectInput
              id="report-month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {monthName(m)}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <div className="w-32">
          <Field label="Year" htmlFor="report-year">
            <TextInput
              id="report-year"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </Field>
        </div>
        <Button onClick={() => handleGenerate("zip")} disabled={pending}>
          <Download className="h-4 w-4" />
          {pending ? "Generating..." : "Download all 3 files (ZIP)"}
        </Button>
        <div className="w-full border-t border-gray-100 pt-3">
          <p className="mb-2 text-xs text-gray-500">Ya sirf ek file download karo:</p>
          <div className="flex flex-wrap gap-2">
            {MONTHLY_FILES.map((f) => (
              <Button
                key={f.scope}
                variant="secondary"
                size="sm"
                onClick={() => handleGenerate(f.scope)}
                disabled={pending}
              >
                <Download className="h-3.5 w-3.5" /> {f.label}
              </Button>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

const MONTHLY_FILES = [
  { scope: "main", label: "Kitchen + Grocery Store + Bakery" },
  { scope: "others", label: "Other Departments" },
  { scope: "total", label: "Total (All)" },
];

export function CustomReportForm() {
  const [from, setFrom] = useState(todayISODate());
  const [to, setTo] = useState(todayISODate());
  const [pending, setPending] = useState(false);

  async function handleGenerate() {
    if (new Date(from) > new Date(to)) {
      toast.error("Start date must be before end date");
      return;
    }
    setPending(true);
    try {
      await downloadReport(
        `/api/reports/custom?from=${from}&to=${to}`,
        `Store_Report_${from}_to_${to}.xlsx`
      );
      toast.success("Report generated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to generate report");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Custom Date Range Report"
        description="Pick any start and end date."
      />
      <CardBody className="flex flex-wrap items-end gap-3">
        <div>
          <Field label="Start Date" htmlFor="report-from">
            <TextInput
              id="report-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
        </div>
        <div>
          <Field label="End Date" htmlFor="report-to">
            <TextInput
              id="report-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
        </div>
        <Button onClick={handleGenerate} disabled={pending}>
          <Download className="h-4 w-4" />
          {pending ? "Generating..." : "Generate XLSX"}
        </Button>
      </CardBody>
    </Card>
  );
}
