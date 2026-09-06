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

  async function handleGenerate() {
    setPending(true);
    try {
      await downloadReport(
        `/api/reports/monthly?month=${month}&year=${year}`,
        `Store_Report_${monthName(month)}_${year}.xlsx`
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
        description="Complete opening/closing stock, expenses and movement for one month."
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
        <Button onClick={handleGenerate} disabled={pending}>
          <Download className="h-4 w-4" />
          {pending ? "Generating..." : "Generate XLSX"}
        </Button>
      </CardBody>
    </Card>
  );
}

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
