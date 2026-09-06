-- ============================================================================
-- Security fix: PostgreSQL grants EXECUTE to PUBLIC by default on every new
-- function. 0004/0005 granted execute to `authenticated` but never revoked
-- the default PUBLIC grant — meaning the `anon` role (i.e. anyone holding
-- only the public anon key, which is meant to be publicly embeddable) could
-- have called every SECURITY DEFINER function directly, bypassing RLS
-- entirely (create/void incoming or outgoing entries, even archive a year).
--
-- This revokes that default PUBLIC grant and re-grants explicitly only to
-- `authenticated` (the app's session role) and `service_role` (server-side
-- scripts/admin tooling using the service key).
-- ============================================================================

revoke execute on function
  fn_upsert_product(text, text),
  fn_upsert_department(text),
  fn_update_department(uuid, text, text),
  fn_update_product(uuid, text, text, text),
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
from public;

grant execute on function
  fn_upsert_product(text, text),
  fn_upsert_department(text),
  fn_update_department(uuid, text, text),
  fn_update_product(uuid, text, text, text),
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
to authenticated, service_role;
