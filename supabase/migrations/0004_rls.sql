-- ============================================================================
-- Row Level Security
--
-- Single-operator system: any authenticated Supabase user (there will only
-- ever be the one operator account) may read every table. All writes are
-- funneled through the SECURITY DEFINER functions in 0002/0003, which run as
-- the function owner and therefore bypass these policies internally — so no
-- insert/update/delete policy is granted to `authenticated` at all. This
-- means even a leaked anon/authenticated key can only ever read data, never
-- corrupt FIFO history by writing directly to the tables.
-- ============================================================================

alter table departments enable row level security;
alter table products enable row level security;
alter table incoming_batches enable row level security;
alter table outgoing_entries enable row level security;
alter table outgoing_allocations enable row level security;
alter table yearly_archives enable row level security;
alter table incoming_batches_archive enable row level security;
alter table outgoing_entries_archive enable row level security;
alter table outgoing_allocations_archive enable row level security;

create policy "authenticated_read_departments" on departments
  for select to authenticated using (true);
create policy "authenticated_read_products" on products
  for select to authenticated using (true);
create policy "authenticated_read_incoming_batches" on incoming_batches
  for select to authenticated using (true);
create policy "authenticated_read_outgoing_entries" on outgoing_entries
  for select to authenticated using (true);
create policy "authenticated_read_outgoing_allocations" on outgoing_allocations
  for select to authenticated using (true);
create policy "authenticated_read_yearly_archives" on yearly_archives
  for select to authenticated using (true);
create policy "authenticated_read_incoming_batches_archive" on incoming_batches_archive
  for select to authenticated using (true);
create policy "authenticated_read_outgoing_entries_archive" on outgoing_entries_archive
  for select to authenticated using (true);
create policy "authenticated_read_outgoing_allocations_archive" on outgoing_allocations_archive
  for select to authenticated using (true);

revoke insert, update, delete on
  departments, products, incoming_batches, outgoing_entries, outgoing_allocations,
  yearly_archives, incoming_batches_archive, outgoing_entries_archive, outgoing_allocations_archive
from authenticated;

grant execute on function
  fn_upsert_product(text, text),
  fn_upsert_department(text),
  fn_create_incoming_batch(text, text, numeric, numeric, numeric, date, time, text, text),
  fn_update_incoming_batch(uuid, numeric, numeric, numeric, date, time, text, text),
  fn_void_incoming_batch(uuid, text),
  fn_process_outgoing(uuid, uuid, numeric, date, time, text, boolean),
  fn_void_outgoing_entry(uuid, text),
  fn_current_stock(),
  fn_dashboard_summary(),
  fn_product_report_summary(date, date),
  fn_department_report_summary(date, date),
  fn_daily_activity(date, date),
  fn_archive_year(int, text, text, text)
to authenticated;
