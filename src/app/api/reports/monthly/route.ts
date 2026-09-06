import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchReportData } from "@/lib/xlsx/report-data";
import { buildRangeWorkbook } from "@/lib/xlsx/build-range-workbook";
import { monthRange, monthName } from "@/lib/utils";
import { monthlyReportSchema } from "@/lib/validation";

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

  const { month, year } = parsed.data;
  const [from, to] = monthRange(month, year);

  try {
    const data = await fetchReportData(supabase, from, to);
    const workbook = buildRangeWorkbook(data, {
      title: `Monthly Store Report — ${monthName(month)} ${year}`,
      periodLabel: `${monthName(month)} ${year}`,
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Store_Report_${monthName(month)}_${year}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error("Failed to generate monthly report", err);
    return NextResponse.json(
      { error: "Unable to generate report" },
      { status: 500 }
    );
  }
}
