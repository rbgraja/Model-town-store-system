import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { monthRange, monthName } from "@/lib/utils";
import {
  buildDepartmentWorkbook,
  fetchDepartmentReportData,
} from "@/lib/xlsx/build-department-workbook";

const querySchema = z.object({
  department: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = querySchema.safeParse({
    department: request.nextUrl.searchParams.get("department"),
    month: request.nextUrl.searchParams.get("month"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid department or month" }, { status: 400 });
  }

  const [year, month] = parsed.data.month.split("-").map(Number);
  const [from, to] = monthRange(month, year);

  try {
    const data = await fetchDepartmentReportData(supabase, parsed.data.department, from, to);
    if (!data) return NextResponse.json({ error: "Department not found" }, { status: 404 });

    const periodLabel = `${monthName(month)} ${year}`;
    const buffer = await buildDepartmentWorkbook(data, periodLabel).xlsx.writeBuffer();
    const safeName = data.departmentName.replace(/[^\w\-]+/g, "_");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeName}_${monthName(month)}_${year}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("Failed to generate department report", err);
    return NextResponse.json({ error: "Unable to generate report" }, { status: 500 });
  }
}
