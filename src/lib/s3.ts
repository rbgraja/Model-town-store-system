import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Storage backend: a Supabase Storage bucket (public), talked to via the
// supabase-js storage client rather than the raw S3 protocol — simpler than
// managing separate S3 access keys when the bucket already lives in the
// same Supabase project. Swap this file's internals for the AWS S3 SDK if
// you later move receipts to an external bucket (R2, MinIO, AWS S3); every
// other call site only depends on the exported function signatures below.

export const ALLOWED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
export const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function bucket() {
  return process.env.SUPABASE_STORAGE_BUCKET!;
}

export function extensionForContentType(contentType: string): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

async function upload(
  key: string,
  bytes: Uint8Array,
  contentType: string
): Promise<{ path: string; url: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(bucket())
    .upload(key, bytes, { contentType, upsert: false });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  return { path: key, url: await resolveViewUrl(key) };
}

/** Uploads a receipt image/PDF and returns its storage key plus a viewable URL. */
export async function uploadReceipt(
  bytes: Uint8Array,
  contentType: string
): Promise<{ path: string; url: string }> {
  const now = new Date();
  const ext = extensionForContentType(contentType);
  const key = `receipts/${now.getUTCFullYear()}/${String(
    now.getUTCMonth() + 1
  ).padStart(2, "0")}/${randomUUID()}.${ext}`;

  return upload(key, bytes, contentType);
}

/** Uploads a generated report (yearly archive XLSX) and returns its storage key + URL. */
export async function uploadReportFile(
  key: string,
  bytes: Uint8Array,
  contentType: string
): Promise<{ path: string; url: string }> {
  return upload(key, bytes, contentType);
}

export function publicUrlFor(key: string): string {
  const supabase = createAdminClient();
  return supabase.storage.from(bucket()).getPublicUrl(key).data.publicUrl;
}

export async function signedUrlFor(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket())
    .createSignedUrl(key, expiresInSeconds);
  if (error || !data) throw new Error(`Unable to sign URL: ${error?.message}`);
  return data.signedUrl;
}

/**
 * Resolves the freshest viewable URL for a stored object key. The bucket is
 * public, so this is just the stable public URL — swap to `signedUrlFor`
 * here (and nowhere else) if the bucket is ever made private.
 */
export async function resolveViewUrl(key: string): Promise<string> {
  return publicUrlFor(key);
}

export async function deleteObject(key: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(bucket()).remove([key]);
  if (error) throw new Error(`Storage delete failed: ${error.message}`);
}
