import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildYearlyWorkbook } from "@/lib/xlsx/build-yearly-workbook";
import { uploadReportFile } from "@/lib/s3";
import { archiveYearSchema } from "@/lib/validation";
import { errorMessage } from "@/lib/utils";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = archiveYearSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid year" },
      { status: 400 }
    );
  }
  const { year } = parsed.data;

  // Step 1: generate the yearly XLSX from the still-live tables.
  let bytes: Buffer;
  try {
    const { workbook } = await buildYearlyWorkbook(supabase, year);
    bytes = Buffer.from(await workbook.xlsx.writeBuffer());
  } catch (err) {
    console.error("Failed to generate yearly archive workbook", err);
    return NextResponse.json(
      { error: "Unable to generate the yearly report" },
      { status: 500 }
    );
  }

  // Step 2: upload it to S3-compatible storage and verify the upload.
  const fileName = `Store_Report_${year}.xlsx`;
  const key = `archives/${year}/${fileName}`;
  let fileUrl: string;
  try {
    const uploaded = await uploadReportFile(
      key,
      bytes,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    fileUrl = uploaded.url;
  } catch (err) {
    console.error("Failed to upload yearly archive to storage", err);
    return NextResponse.json(
      { error: "Report generated but upload to storage failed. Nothing was archived." },
      { status: 500 }
    );
  }

  // Step 3: only now, with the file safely stored, move the year's detailed
  // rows out of the live tables (see fn_archive_year for the safety rules).
  const { data, error } = await supabase.rpc("fn_archive_year", {
    p_year: year,
    p_file_name: fileName,
    p_file_url: fileUrl,
    p_file_path: key,
  });

  if (error) {
    return NextResponse.json(
      {
        error: `${errorMessage(new Error(error.message))} The report file was saved to storage, but no records were archived.`,
      },
      { status: 400 }
    );
  }

  revalidatePath("/archives");
  const result = data?.[0];
  return NextResponse.json({
    ok: true,
    incomingArchived: result?.incoming_archived ?? 0,
    outgoingArchived: result?.outgoing_archived ?? 0,
  });
}
