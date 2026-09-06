import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchReportData } from "@/lib/xlsx/report-data";
import { buildRangeWorkbook } from "@/lib/xlsx/build-range-workbook";
import { customReportSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = customReportSchema.safeParse({
    from: request.nextUrl.searchParams.get("from"),
    to: request.nextUrl.searchParams.get("to"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid date range" },
      { status: 400 }
    );
  }

  const { from, to } = parsed.data;

  try {
    const data = await fetchReportData(supabase, from, to);
    const workbook = buildRangeWorkbook(data, {
      title: `Store Report — ${from} to ${to}`,
      periodLabel: `${from} to ${to}`,
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Store_Report_${from}_to_${to}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error("Failed to generate custom report", err);
    return NextResponse.json(
      { error: "Unable to generate report" },
      { status: 500 }
    );
  }
}
