-- ============================================================================
-- Bulk incoming entry (multiple products, one date) + inline "send some of
-- these out now" — the Incoming-side counterpart to 0009's bulk outgoing.
--
-- fn_create_incoming_batch_bulk creates N incoming batches (one per product,
-- same as the single-entry flow) in one transaction, and — for whichever
-- items the operator marked with an outgoing_quantity — immediately issues
-- that quantity to one shared department via the same FIFO engine used
-- everywhere else (fn_process_outgoing). One bad item rolls back the whole
-- save, exactly like fn_process_outgoing_bulk.
--
-- incoming_batches.batch_id (mirrors outgoing_entries.batch_id from 0009)
-- ties every row from one bulk save together purely for display grouping —
-- each product still gets its own incoming_batches row, which is the correct
-- grain for FIFO costing.
-- ============================================================================

alter table incoming_batches
  add column if not exists batch_id uuid;

create index if not exists incoming_batches_batch_idx
  on incoming_batches (batch_id) where batch_id is not null;

-- ---------------------------------------------------------------------------
-- fn_create_incoming_batch_bulk
-- p_items is a jsonb array of objects:
--   { product_name, unit, quantity, total_price, unit_price,
--     receipt_url?, receipt_path?, outgoing_quantity? }
-- p_department_id is required only if at least one item carries a positive
-- outgoing_quantity (validated below) — every immediate-outgoing item in one
-- save goes to the same department, matching the bulk outgoing form's model.
-- ---------------------------------------------------------------------------
create or replace function fn_create_incoming_batch_bulk(
  p_entry_date date,
  p_entry_time time,
  p_items jsonb,
  p_department_id uuid default null
)
returns setof incoming_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_batch_id uuid := gen_random_uuid();
  v_batch incoming_batches;
  v_outgoing_qty numeric;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'ITEMS_REQUIRED';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_outgoing_qty := nullif(v_item->>'outgoing_quantity', '')::numeric;

    if v_outgoing_qty is not null and v_outgoing_qty > 0 and p_department_id is null then
      raise exception 'DEPARTMENT_REQUIRED_FOR_OUTGOING';
    end if;

    v_batch := fn_create_incoming_batch(
      v_item->>'product_name',
      v_item->>'unit',
      (v_item->>'quantity')::numeric,
      (v_item->>'total_price')::numeric,
      (v_item->>'unit_price')::numeric,
      p_entry_date,
      p_entry_time,
      nullif(v_item->>'receipt_url', ''),
      nullif(v_item->>'receipt_path', '')
    );

    update incoming_batches set batch_id = v_batch_id where id = v_batch.id
      returning * into v_batch;

    if v_outgoing_qty is not null and v_outgoing_qty > 0 then
      if v_outgoing_qty > v_batch.quantity then
        raise exception 'OUTGOING_EXCEEDS_INCOMING: incoming=% outgoing=%', v_batch.quantity, v_outgoing_qty;
      end if;

      perform fn_process_outgoing(
        v_batch.product_id, p_department_id, v_outgoing_qty,
        p_entry_date, p_entry_time, null, false
      );
    end if;

    return next v_batch;
  end loop;

  return;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants — same pattern as every write function (see 0006_grants_fix.sql).
-- ---------------------------------------------------------------------------
revoke execute on function
  fn_create_incoming_batch_bulk(date, time, jsonb, uuid)
from public;

grant execute on function
  fn_create_incoming_batch_bulk(date, time, jsonb, uuid)
to authenticated, service_role;
