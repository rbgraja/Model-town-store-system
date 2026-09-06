// Full wipe of the Supabase project.
// - Empties every application table (live + archive)
// - Empties the store-management-receipts storage bucket
// - Deletes every auth user except admin@gmail.com
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "store-management-receipts";
const KEEP_EMAIL = "admin@gmail.com";

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Order matters: children before parents (FK deletes with ON DELETE RESTRICT).
// outgoing_allocations -> outgoing_entries -> incoming_batches -> products/departments
// yearly_archives and *_archive tables are independent.
const TABLES_IN_ORDER = [
  "outgoing_allocations",
  "outgoing_entries",
  "incoming_batches",
  "outgoing_allocations_archive",
  "outgoing_entries_archive",
  "incoming_batches_archive",
  "yearly_archives",
  "products",
  "departments",
];

async function wipeTable(name) {
  // Delete all rows. Use a filter that matches everything (id is not null).
  const { error, count } = await supabase
    .from(name)
    .delete({ count: "exact" })
    .not("id", "is", null);
  if (error) {
    console.error(`  ! ${name}: ${error.message}`);
    return false;
  }
  console.log(`  - ${name}: deleted ${count ?? "?"} rows`);
  return true;
}

async function wipeAllTables() {
  console.log("Wiping tables...");
  for (const t of TABLES_IN_ORDER) {
    await wipeTable(t);
  }
}

async function wipeStorage() {
  console.log(`Emptying storage bucket "${bucket}"...`);
  // Walk the bucket recursively and remove every file.
  async function listAll(prefix = "") {
    const collected = [];
    let offset = 0;
    const pageSize = 100;
    while (true) {
      const { data, error } = await supabase.storage.from(bucket).list(prefix, {
        limit: pageSize,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) {
        console.error(`  ! list("${prefix}"): ${error.message}`);
        return collected;
      }
      if (!data || data.length === 0) break;
      for (const entry of data) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        // Files have an id; folders (prefixes) don't.
        if (entry.id) {
          collected.push(path);
        } else {
          const nested = await listAll(path);
          collected.push(...nested);
        }
      }
      if (data.length < pageSize) break;
      offset += pageSize;
    }
    return collected;
  }

  const paths = await listAll("");
  if (paths.length === 0) {
    console.log("  - bucket already empty");
    return;
  }
  // Remove in chunks
  const chunk = 100;
  let removed = 0;
  for (let i = 0; i < paths.length; i += chunk) {
    const slice = paths.slice(i, i + chunk);
    const { error } = await supabase.storage.from(bucket).remove(slice);
    if (error) {
      console.error(`  ! remove chunk: ${error.message}`);
    } else {
      removed += slice.length;
    }
  }
  console.log(`  - removed ${removed}/${paths.length} objects`);
}

async function wipeAuthUsers() {
  console.log(`Deleting auth users (keeping ${KEEP_EMAIL})...`);
  let page = 1;
  const perPage = 200;
  let deleted = 0;
  let kept = 0;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error(`  ! listUsers: ${error.message}`);
      return;
    }
    const users = data?.users ?? [];
    if (users.length === 0) break;
    for (const u of users) {
      if ((u.email || "").toLowerCase() === KEEP_EMAIL.toLowerCase()) {
        kept++;
        continue;
      }
      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
      if (delErr) {
        console.error(`  ! delete ${u.email || u.id}: ${delErr.message}`);
      } else {
        deleted++;
      }
    }
    if (users.length < perPage) break;
    page++;
  }
  console.log(`  - deleted ${deleted}, kept ${kept}`);
}

async function main() {
  console.log(`Target: ${url}`);
  await wipeAllTables();
  await wipeStorage();
  await wipeAuthUsers();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
