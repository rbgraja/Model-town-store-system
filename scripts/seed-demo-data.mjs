// One-off demo/admin seeding script — NOT part of the app itself.
// Run with:  node --env-file=.env.local scripts/seed-demo-data.mjs
//
// Creates the single operator account and a July 2026 batch of dummy
// incoming/outgoing entries (plus one June batch so July shows a non-zero
// opening balance) purely so the Reports page has something to render.
// Safe to re-run: department/product upserts are idempotent by name, and
// entries are only inserted if this exact seed hasn't already run (checked
// via a marker note on the first outgoing entry).

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_MARKER = "seed-demo-data-2026-07";

async function ensureAdminUser() {
  const email = "admin@gmail.com";
  const password = "Admin@1321";

  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw new Error(`listUsers failed: ${listError.message}`);

  const existing = list.users.find((u) => u.email === email);
  if (existing) {
    console.log(`Admin user already exists (${email}) — leaving as-is.`);
    return;
  }

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser failed: ${error.message}`);
  console.log(`Created admin user ${email}.`);
}

async function upsertDepartment(name) {
  const { data, error } = await supabase.rpc("fn_upsert_department", { p_name: name });
  if (error) throw new Error(`fn_upsert_department(${name}) failed: ${error.message}`);
  return data;
}

async function createIncoming({ productName, unit, quantity, totalPrice, unitPrice, date, time }) {
  const { data, error } = await supabase.rpc("fn_create_incoming_batch", {
    p_product_name: productName,
    p_unit: unit,
    p_quantity: quantity,
    p_total_price: totalPrice,
    p_unit_price: unitPrice ?? Number((totalPrice / quantity).toFixed(4)),
    p_entry_date: date,
    p_entry_time: time,
  });
  if (error) throw new Error(`fn_create_incoming_batch(${productName}) failed: ${error.message}`);
  return data;
}

async function createOutgoing({ productId, departmentId, quantity, date, time, notes }) {
  const { data, error } = await supabase.rpc("fn_process_outgoing", {
    p_product_id: productId,
    p_department_id: departmentId,
    p_quantity: quantity,
    p_entry_date: date,
    p_entry_time: time,
    p_notes: notes ?? null,
    p_allow_override: false,
  });
  if (error) throw new Error(`fn_process_outgoing(${productId}) failed: ${error.message}`);
  return data;
}

async function alreadySeeded() {
  const { data, error } = await supabase
    .from("outgoing_entries")
    .select("id")
    .eq("notes", SEED_MARKER)
    .limit(1);
  if (error) throw new Error(`Check-seeded query failed: ${error.message}`);
  return (data ?? []).length > 0;
}

async function main() {
  await ensureAdminUser();

  if (await alreadySeeded()) {
    console.log("Demo data already seeded — skipping (delete the entries first to reseed).");
    return;
  }

  console.log("Seeding departments...");
  const departments = {};
  for (const name of ["Kitchen", "Admin", "Security", "Cleaning", "Staff Room"]) {
    const dept = await upsertDepartment(name);
    departments[name] = dept.id;
  }

  console.log("Seeding incoming batches (June carry-forward + July purchases)...");

  // June batch so Sugar shows a non-zero July opening balance.
  await createIncoming({
    productName: "Sugar",
    unit: "KG",
    quantity: 50,
    totalPrice: 7500,
    unitPrice: 150,
    date: "2026-06-25",
    time: "10:00",
  });

  const sugarJuly1 = await createIncoming({
    productName: "Sugar",
    unit: "KG",
    quantity: 100,
    totalPrice: 18000,
    unitPrice: 180,
    date: "2026-07-05",
    time: "09:30",
  });
  await createIncoming({
    productName: "Sugar",
    unit: "KG",
    quantity: 50,
    totalPrice: 10000,
    unitPrice: 200,
    date: "2026-07-20",
    time: "11:00",
  });

  const rice = await createIncoming({
    productName: "Rice",
    unit: "KG",
    quantity: 80,
    totalPrice: 17600,
    unitPrice: 220,
    date: "2026-07-06",
    time: "09:00",
  });

  await createIncoming({
    productName: "Cooking Oil",
    unit: "Liter",
    quantity: 20,
    totalPrice: 6000,
    unitPrice: 300,
    date: "2026-07-02",
    time: "08:45",
  });
  const oilJuly24 = await createIncoming({
    productName: "Cooking Oil",
    unit: "Liter",
    quantity: 10,
    totalPrice: 3200,
    unitPrice: 320,
    date: "2026-07-24",
    time: "10:15",
  });

  const surfExcel = await createIncoming({
    productName: "Surf Excel Liquid",
    unit: "Liter",
    quantity: 10,
    totalPrice: 2500,
    unitPrice: 250,
    date: "2026-07-03",
    time: "09:00",
  });

  const harpic = await createIncoming({
    productName: "Harpic",
    unit: "Piece",
    quantity: 12,
    totalPrice: 1080,
    unitPrice: 90,
    date: "2026-07-04",
    time: "09:15",
  });

  const tea = await createIncoming({
    productName: "Tea Packets",
    unit: "Packet",
    quantity: 50,
    totalPrice: 2250,
    unitPrice: 45,
    date: "2026-07-08",
    time: "09:45",
  });

  const productIds = {
    Sugar: sugarJuly1.product_id,
    Rice: rice.product_id,
    "Cooking Oil": oilJuly24.product_id,
    "Surf Excel Liquid": surfExcel.product_id,
    Harpic: harpic.product_id,
    "Tea Packets": tea.product_id,
  };

  console.log("Seeding outgoing entries...");

  await createOutgoing({
    productId: productIds.Sugar,
    departmentId: departments.Kitchen,
    quantity: 20,
    date: "2026-07-10",
    time: "10:30",
    notes: SEED_MARKER,
  });
  await createOutgoing({
    productId: productIds.Sugar,
    departmentId: departments["Staff Room"],
    quantity: 10,
    date: "2026-07-15",
    time: "11:00",
  });
  await createOutgoing({
    productId: productIds.Sugar,
    departmentId: departments.Kitchen,
    quantity: 15,
    date: "2026-07-25",
    time: "09:00",
  });

  await createOutgoing({
    productId: productIds.Rice,
    departmentId: departments.Kitchen,
    quantity: 30,
    date: "2026-07-22",
    time: "10:00",
  });

  await createOutgoing({
    productId: productIds["Cooking Oil"],
    departmentId: departments.Kitchen,
    quantity: 12,
    date: "2026-07-14",
    time: "09:30",
  });

  await createOutgoing({
    productId: productIds["Surf Excel Liquid"],
    departmentId: departments.Cleaning,
    quantity: 4,
    date: "2026-07-12",
    time: "10:00",
  });

  await createOutgoing({
    productId: productIds.Harpic,
    departmentId: departments.Cleaning,
    quantity: 5,
    date: "2026-07-18",
    time: "10:00",
  });

  await createOutgoing({
    productId: productIds["Tea Packets"],
    departmentId: departments["Staff Room"],
    quantity: 20,
    date: "2026-07-16",
    time: "09:00",
  });
  await createOutgoing({
    productId: productIds["Tea Packets"],
    departmentId: departments.Admin,
    quantity: 10,
    date: "2026-07-28",
    time: "09:00",
  });

  console.log("Done. July 2026 demo data seeded.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
