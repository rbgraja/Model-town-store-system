import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ALLOWED_RECEIPT_TYPES,
  MAX_RECEIPT_SIZE_BYTES,
  uploadReceipt,
} from "@/lib/s3";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_RECEIPT_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPG, PNG, WEBP or PDF receipts are allowed" },
      { status: 400 }
    );
  }
  if (file.size > MAX_RECEIPT_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Receipt file is too large (max 5 MB)" },
      { status: 400 }
    );
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { path, url } = await uploadReceipt(bytes, file.type);
    return NextResponse.json({ path, url });
  } catch {
    return NextResponse.json(
      { error: "Receipt upload failed" },
      { status: 500 }
    );
  }
}
