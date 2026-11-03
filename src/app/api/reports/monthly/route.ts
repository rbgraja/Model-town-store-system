import { NextResponse, type NextRequest } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { fetchReportData } from "@/lib/xlsx/report-data";
import { buildRangeWorkbook } from "@/lib/xlsx/build-range-workbook";
import { buildGroupWorkbook } from "@/lib/xlsx/build-group-workbook";
import { REPORT_SCOPES, isReportScope } from "@/lib/xlsx/department-groups";
import { monthRange, monthName } from "@/lib/utils";
import { monthlyReportSchema } from "@/lib/validation";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * ?scope= total (default, the original all-in report) | kitchen | grocery |
 * bakery | others | zip (all five files in one download).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = monthlyReportSchema.safeParse({
    month: request.nextUrl.searchParams.get("month"),
    year: request.nextUrl.searchParams.get("year"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid month or year" }, { status: 400 });
  }
  const scopeParam = request.nextUrl.searchParams.get("scope") ?? "total";
  if (!isReportScope(scopeParam)) {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }

  const { month, year } = parsed.data;
  const [from, to] = monthRange(month, year);
  const periodLabel = `${monthName(month)} ${year}`;
  const base = `Store_Report_${monthName(month)}_${year}`;

  try {
    const data = await fetchReportData(supabase, from, to);

    const buildFile = async (scope: (typeof REPORT_SCOPES)[number]) => {
      const wb =
        scope.key === "total"
          ? buildRangeWorkbook(data, {
              title: `Monthly Store Report — ${periodLabel}`,
              periodLabel,
            })
          : buildGroupWorkbook(data, scope.key, scope.label, periodLabel);
      return Buffer.from(await wb.xlsx.writeBuffer());
    };

    if (scopeParam === "zip") {
      const zip = new JSZip();
      for (const scope of REPORT_SCOPES) {
        zip.file(`${base}_${scope.fileSuffix}.xlsx`, await buildFile(scope));
      }
      const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
      return new NextResponse(new Uint8Array(zipBuffer), {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${base}_All_Files.zip"`,
        },
      });
    }

    const scope = REPORT_SCOPES.find((s) => s.key === scopeParam)!;
    const buffer = await buildFile(scope);
    // The total keeps its original file name so existing habits don't break.
    const fileName = scope.key === "total" ? `${base}.xlsx` : `${base}_${scope.fileSuffix}.xlsx`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": XLSX_TYPE,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error("Failed to generate monthly report", err);
    return NextResponse.json({ error: "Unable to generate report" }, { status: 500 });
  }
}
