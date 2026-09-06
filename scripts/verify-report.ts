// One-off verification script (not part of the app) — generates the July
// 2026 monthly report using the real report-building code, so we can
// inspect the actual XLSX output without going through the browser.
//
// Run with: npx tsx scripts/verify-report.ts

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { fetchReportData } from "../src/lib/xlsx/report-data";
import { buildRangeWorkbook } from "../src/lib/xlsx/build-range-workbook";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const from = "2026-07-01";
  const to = "2026-07-31";

  console.log("Fetching report data for", from, "to", to);
  const data = await fetchReportData(supabase, from, to);

  console.log("productSummary rows:", data.productSummary.length);
  console.log("departmentSummary rows:", data.departmentSummary.length);
  console.log("incomingRows:", data.incomingRows.length);
  console.log("outgoingRows:", data.outgoingRows.length);
  console.log("dailyActivity rows:", data.dailyActivity.length);

  const workbook = buildRangeWorkbook(data, {
    title: "Monthly Store Report — July 2026",
    periodLabel: "July 2026",
  });

  const buffer = await workbook.xlsx.writeBuffer();
  writeFileSync("Store_Report_July_2026.xlsx", Buffer.from(buffer));
  console.log("Wrote Store_Report_July_2026.xlsx");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
