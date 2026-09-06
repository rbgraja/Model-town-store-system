-- ============================================================================
-- Store Management System — yearly archival
--
-- Called only AFTER the yearly XLSX has been generated and uploaded to S3.
-- Everything below runs in one transaction: if any step fails, nothing is
-- archived and no yearly_archives row exists — there is no partial state.
--
-- Safety rule (see design note in the app's ARCHITECTURE notes / chat):
--   * A batch is only ever deleted from the live table once it is fully
--     consumed (remaining_quantity = 0) AND no live outgoing_allocations
--     row still points at it. The FK (outgoing_allocations.incoming_batch_id
--     references incoming_batches on delete restrict) makes this the last
--     line of defense — if the pre-filter is ever wrong, the delete itself
--     fails loudly instead of corrupting FIFO history.
--   * An outgoing_entry is only archived once every batch it allocated
--     against is itself fully consumed — i.e. it will never be needed again
--     to reconstruct a future opening-stock snapshot.
--   * Anything not yet eligible is simply left live. "Archive Year" can be
--     re-run later (e.g. when archiving the following year) and will sweep
--     up whatever has since become eligible.
-- ============================================================================

create or replace function fn_archive_year(
  p_year int,
  p_file_name text,
  p_file_url text,
  p_file_path text
)
returns table (
  incoming_archived int,
  outgoing_archived int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year_end date := make_date(p_year, 12, 31);
  v_incoming_count int := 0;
  v_outgoing_count int := 0;
begin
  if p_year is null or p_year < 2000 then
    raise exception 'INVALID_YEAR';
  end if;
  if p_year >= extract(year from current_date)::int then
    raise exception 'CANNOT_ARCHIVE_CURRENT_OR_FUTURE_YEAR';
  end if;
  if exists (select 1 from yearly_archives where year = p_year) then
    raise exception 'YEAR_ALREADY_ARCHIVED';
  end if;

  -- ---- outgoing entries whose entire cost basis is already fully consumed ----
  create temporary table _archive_outgoing_ids on commit drop as
  select oe.id
  from outgoing_entries oe
  where oe.entry_date <= v_year_end
    and not exists (
      select 1
      from outgoing_allocations oa
      join incoming_batches ib on ib.id = oa.incoming_batch_id
      where oa.outgoing_entry_id = oe.id
        and ib.remaining_quantity <> 0
    );

  insert into outgoing_entries_archive (
    id, product_id, product_name, department_id, department_name,
    entry_date, entry_time, quantity, unit, total_cost, notes,
    is_override, is_void, void_reason, created_at, archived_year
  )
  select
    oe.id, oe.product_id, p.name, oe.department_id, d.name,
    oe.entry_date, oe.entry_time, oe.quantity, oe.unit, oe.total_cost, oe.notes,
    oe.is_override, oe.is_void, oe.void_reason, oe.created_at, p_year
  from outgoing_entries oe
  join products p on p.id = oe.product_id
  join departments d on d.id = oe.department_id
  where oe.id in (select id from _archive_outgoing_ids);

  get diagnostics v_outgoing_count = row_count;

  insert into outgoing_allocations_archive (
    id, outgoing_entry_id, incoming_batch_id, quantity, unit_cost, total_cost, created_at, archived_year
  )
  select id, outgoing_entry_id, incoming_batch_id, quantity, unit_cost, total_cost, created_at, p_year
  from outgoing_allocations
  where outgoing_entry_id in (select id from _archive_outgoing_ids);

  delete from outgoing_allocations where outgoing_entry_id in (select id from _archive_outgoing_ids);
  delete from outgoing_entries where id in (select id from _archive_outgoing_ids);

  -- ---- batches fully consumed and no longer referenced by any live allocation ----
  create temporary table _archive_batch_ids on commit drop as
  select ib.id
  from incoming_batches ib
  where ib.remaining_quantity = 0
    and ib.entry_date <= v_year_end
    and not exists (
      select 1 from outgoing_allocations oa where oa.incoming_batch_id = ib.id
    );

  insert into incoming_batches_archive (
    id, product_id, product_name, entry_date, entry_time, quantity, remaining_quantity,
    unit, total_price, unit_price, receipt_url, receipt_path, is_void, void_reason,
    created_at, archived_year
  )
  select
    ib.id, ib.product_id, p.name, ib.entry_date, ib.entry_time, ib.quantity, ib.remaining_quantity,
    ib.unit, ib.total_price, ib.unit_price, ib.receipt_url, ib.receipt_path, ib.is_void, ib.void_reason,
    ib.created_at, p_year
  from incoming_batches ib
  join products p on p.id = ib.product_id
  where ib.id in (select id from _archive_batch_ids);

  get diagnostics v_incoming_count = row_count;

  delete from incoming_batches where id in (select id from _archive_batch_ids);

  insert into yearly_archives (
    year, file_name, file_url, file_path, status,
    entries_archived_incoming, entries_archived_outgoing
  ) values (
    p_year, p_file_name, p_file_url, p_file_path, 'completed',
    v_incoming_count, v_outgoing_count
  );

  return query select v_incoming_count, v_outgoing_count;
end;
$$;
