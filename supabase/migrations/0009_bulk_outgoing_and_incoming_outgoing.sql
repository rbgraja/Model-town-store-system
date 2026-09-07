-- ============================================================================
-- Bulk outgoing + "Incoming + Outgoing" combined entry
--
-- Two new capabilities, built entirely on the existing tables/functions —
-- no new models:
--
--   1. fn_create_incoming_batch_with_outgoing — creates an incoming batch and,
--      in the SAME transaction, immediately issues part (or all) of that
--      quantity to a department via the existing FIFO engine
--      (fn_process_outgoing). One call, atomic: either both happen or
--      neither does.
--
--   2. fn_process_outgoing_bulk — issues N (product, quantity) pairs to one
--      department on one date in a single transaction. Every item is
--      validated through the same fn_process_outgoing checks used by the
--      single-entry flow (stock sufficiency, product/department existence),
--      so if ANY item is invalid the whole batch is rolled back — nothing
--      partial is ever saved.
--
-- outgoing_entries.batch_id ties every row created by one bulk save together
-- purely for display grouping ("Kitchen — 07-09-2026, 5 items") — it does
-- NOT introduce a new department/date record. Each product still gets its
-- own outgoing_entries row (as it always has — that's the correct grain for
-- FIFO costing), so there is nothing to "duplicate": one bulk save simply
-- inserts one row per product, all sharing one batch_id.
-- ============================================================================

alter table outgoing_entries
  add column if not exists batch_id uuid;

create index if not exists outgoing_entries_batch_idx
  on outgoing_entries (batch_id) where batch_id is not null;

-- ---------------------------------------------------------------------------
-- fn_create_incoming_batch_with_outgoing
-- ---------------------------------------------------------------------------
create or replace function fn_create_incoming_batch_with_outgoing(
  p_product_name text,
  p_unit text,
  p_quantity numeric,
  p_total_price numeric,
  p_unit_price numeric,
  p_entry_date date,
  p_entry_time time,
  p_department_id uuid,
  p_outgoing_quantity numeric,
  p_receipt_url text default null,
  p_receipt_path text default null,
  p_notes text default null
)
returns table (
  incoming_batch_id uuid,
  outgoing_entry_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch incoming_batches;
  v_outgoing outgoing_entries;
begin
  if p_outgoing_quantity is null or p_outgoing_quantity <= 0 then
    raise exception 'OUTGOING_QUANTITY_MUST_BE_POSITIVE';
  end if;
  if p_quantity is not null and p_outgoing_quantity > p_quantity then
    raise exception 'OUTGOING_EXCEEDS_INCOMING: incoming=% outgoing=%', p_quantity, p_outgoing_quantity;
  end if;

  v_batch := fn_create_incoming_batch(
    p_product_name, p_unit, p_quantity, p_total_price, p_unit_price,
    p_entry_date, p_entry_time, p_receipt_url, p_receipt_path
  );

  v_outgoing := fn_process_outgoing(
    v_batch.product_id, p_department_id, p_outgoing_quantity,
    p_entry_date, p_entry_time, p_notes, false
  );

  return query select v_batch.id, v_outgoing.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- fn_process_outgoing_bulk
-- p_items is a jsonb array of {"product_id": uuid, "quantity": numeric}.
-- Every item is processed through fn_process_outgoing (same validation,
-- same FIFO allocation as the single-entry flow) inside one transaction, so
-- an insufficient-stock error on item 3 of 5 rolls back all 5 — nothing
-- partial is ever committed. Every row created shares one fresh batch_id.
-- ---------------------------------------------------------------------------
create or replace function fn_process_outgoing_bulk(
  p_department_id uuid,
  p_entry_date date,
  p_entry_time time,
  p_items jsonb,
  p_notes text default null,
  p_allow_override boolean default false
)
returns setof outgoing_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_batch_id uuid := gen_random_uuid();
  v_entry outgoing_entries;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'ITEMS_REQUIRED';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if v_item->>'product_id' is null then
      raise exception 'ITEM_PRODUCT_REQUIRED';
    end if;
    if v_item->>'quantity' is null or (v_item->>'quantity')::numeric <= 0 then
      raise exception 'ITEM_QUANTITY_MUST_BE_POSITIVE';
    end if;

    v_entry := fn_process_outgoing(
      (v_item->>'product_id')::uuid,
      p_department_id,
      (v_item->>'quantity')::numeric,
      p_entry_date,
      p_entry_time,
      p_notes,
      p_allow_override
    );

    update outgoing_entries set batch_id = v_batch_id where id = v_entry.id
      returning * into v_entry;

    return next v_entry;
  end loop;

  return;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants — Postgres grants EXECUTE to PUBLIC by default on every new
-- function (see 0006_grants_fix.sql). Revoke that immediately and grant only
-- to authenticated + service_role, matching every other write function.
-- ---------------------------------------------------------------------------
revoke execute on function
  fn_create_incoming_batch_with_outgoing(text, text, numeric, numeric, numeric, date, time, uuid, numeric, text, text, text),
  fn_process_outgoing_bulk(uuid, date, time, jsonb, text, boolean)
from public;

grant execute on function
  fn_create_incoming_batch_with_outgoing(text, text, numeric, numeric, numeric, date, time, uuid, numeric, text, text, text),
  fn_process_outgoing_bulk(uuid, date, time, jsonb, text, boolean)
to authenticated, service_role;
