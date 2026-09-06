-- ============================================================================
-- Store Management System — business-logic functions
-- All mutating operations that touch more than one table run inside a single
-- SECURITY DEFINER function so they execute atomically and can be exposed to
-- the client purely via RPC (no direct table writes from the browser).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- fn_upsert_product: case/whitespace-insensitive dedupe on create.
-- ---------------------------------------------------------------------------
create or replace function fn_upsert_product(p_name text, p_unit text)
returns products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row products;
begin
  if p_name is null or trim(p_name) = '' then
    raise exception 'PRODUCT_NAME_REQUIRED';
  end if;
  if p_unit is null or trim(p_unit) = '' then
    raise exception 'UNIT_REQUIRED';
  end if;

  insert into products (name, unit)
  values (trim(p_name), trim(p_unit))
  on conflict (normalized_name) do update
    set updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- fn_upsert_department
-- ---------------------------------------------------------------------------
create or replace function fn_upsert_department(p_name text)
returns departments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row departments;
begin
  if p_name is null or trim(p_name) = '' then
    raise exception 'DEPARTMENT_NAME_REQUIRED';
  end if;

  insert into departments (name)
  values (trim(p_name))
  on conflict (normalized_name) do update
    set updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- fn_create_incoming_batch: validates + upserts product + inserts the batch.
-- unit_price is provided by the app (auto-computed there as total/quantity,
-- but the operator may override it) so the DB just persists+validates it.
-- ---------------------------------------------------------------------------
create or replace function fn_create_incoming_batch(
  p_product_name text,
  p_unit text,
  p_quantity numeric,
  p_total_price numeric,
  p_unit_price numeric,
  p_entry_date date,
  p_entry_time time,
  p_receipt_url text default null,
  p_receipt_path text default null
)
returns incoming_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product products;
  v_row incoming_batches;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'QUANTITY_MUST_BE_POSITIVE';
  end if;
  if p_total_price is null or p_total_price < 0 then
    raise exception 'TOTAL_PRICE_INVALID';
  end if;
  if p_unit_price is null or p_unit_price < 0 then
    raise exception 'UNIT_PRICE_INVALID';
  end if;
  if p_entry_date is null then
    raise exception 'DATE_REQUIRED';
  end if;

  v_product := fn_upsert_product(p_product_name, p_unit);

  insert into incoming_batches (
    product_id, entry_date, entry_time, quantity, remaining_quantity,
    unit, total_price, unit_price, receipt_url, receipt_path
  ) values (
    v_product.id, p_entry_date, coalesce(p_entry_time, '00:00'), p_quantity, p_quantity,
    v_product.unit, p_total_price, p_unit_price, p_receipt_url, p_receipt_path
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- fn_update_incoming_batch: edits to an already-partially-consumed batch are
-- restricted to fields that don't retroactively corrupt FIFO cost history
-- (price/date/receipt may be corrected; quantity may only be raised/lowered
-- down to what's already been consumed).
-- ---------------------------------------------------------------------------
create or replace function fn_update_incoming_batch(
  p_batch_id uuid,
  p_quantity numeric,
  p_total_price numeric,
  p_unit_price numeric,
  p_entry_date date,
  p_entry_time time,
  p_receipt_url text default null,
  p_receipt_path text default null
)
returns incoming_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch incoming_batches;
  v_consumed numeric;
  v_row incoming_batches;
begin
  select * into v_batch from incoming_batches where id = p_batch_id for update;
  if not found then
    raise exception 'BATCH_NOT_FOUND';
  end if;
  if v_batch.is_void then
    raise exception 'BATCH_IS_VOID';
  end if;

  v_consumed := v_batch.quantity - v_batch.remaining_quantity;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'QUANTITY_MUST_BE_POSITIVE';
  end if;
  if p_quantity < v_consumed then
    raise exception 'QUANTITY_BELOW_CONSUMED: consumed=%', v_consumed;
  end if;
  if p_total_price is null or p_total_price < 0 then
    raise exception 'TOTAL_PRICE_INVALID';
  end if;
  if p_unit_price is null or p_unit_price < 0 then
    raise exception 'UNIT_PRICE_INVALID';
  end if;

  update incoming_batches set
    quantity = p_quantity,
    remaining_quantity = p_quantity - v_consumed,
    total_price = p_total_price,
    unit_price = p_unit_price,
    entry_date = coalesce(p_entry_date, entry_date),
    entry_time = coalesce(p_entry_time, entry_time),
    receipt_url = coalesce(p_receipt_url, receipt_url),
    receipt_path = coalesce(p_receipt_path, receipt_path)
  where id = p_batch_id
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- fn_void_incoming_batch: only allowed while fully untouched (nothing
-- allocated out of it yet) — otherwise voiding would silently rewrite the
-- cost basis of every outgoing entry that already drew from it.
-- ---------------------------------------------------------------------------
create or replace function fn_void_incoming_batch(p_batch_id uuid, p_reason text)
returns incoming_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch incoming_batches;
  v_row incoming_batches;
begin
  select * into v_batch from incoming_batches where id = p_batch_id for update;
  if not found then
    raise exception 'BATCH_NOT_FOUND';
  end if;
  if v_batch.remaining_quantity <> v_batch.quantity then
    raise exception 'BATCH_ALREADY_ALLOCATED: this purchase has already been partly or fully issued and cannot be voided directly. Void the outgoing entries that consumed it first.';
  end if;

  update incoming_batches
    set is_void = true, remaining_quantity = 0, void_reason = p_reason
    where id = p_batch_id
    returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- fn_process_outgoing: the FIFO costing engine.
-- Locks candidate batches oldest-first, allocates quantity across them,
-- and — only when p_allow_override is true and stock genuinely runs out —
-- keeps drawing from the most recent batch, letting its remaining_quantity
-- go negative rather than fabricating a cost basis out of thin air.
-- ---------------------------------------------------------------------------
create or replace function fn_process_outgoing(
  p_product_id uuid,
  p_department_id uuid,
  p_quantity numeric,
  p_entry_date date,
  p_entry_time time,
  p_notes text default null,
  p_allow_override boolean default false
)
returns outgoing_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product products;
  v_department departments;
  v_batch record;
  v_available numeric := 0;
  v_remaining_to_allocate numeric;
  v_take numeric;
  v_entry outgoing_entries;
  v_total_cost numeric := 0;
  v_last_batch_id uuid;
  v_last_unit_price numeric;
  v_shortfall numeric;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'QUANTITY_MUST_BE_POSITIVE';
  end if;
  if p_entry_date is null then
    raise exception 'DATE_REQUIRED';
  end if;

  select * into v_product from products where id = p_product_id;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  select * into v_department from departments where id = p_department_id;
  if not found then
    raise exception 'DEPARTMENT_NOT_FOUND';
  end if;
  if v_department.status <> 'active' then
    raise exception 'DEPARTMENT_INACTIVE';
  end if;

  -- lock every unconsumed batch for this product, oldest first
  select coalesce(sum(remaining_quantity), 0) into v_available
  from incoming_batches
  where product_id = p_product_id and not is_void and remaining_quantity > 0;

  if v_available < p_quantity and not p_allow_override then
    raise exception 'INSUFFICIENT_STOCK: available=% requested=%', v_available, p_quantity;
  end if;

  if v_available <= 0 and p_quantity > 0 and (
    select count(*) from incoming_batches where product_id = p_product_id and not is_void
  ) = 0 then
    raise exception 'NO_PURCHASE_HISTORY: this product has never been purchased, there is no cost basis to issue against';
  end if;

  insert into outgoing_entries (
    product_id, department_id, entry_date, entry_time, quantity, unit, notes, is_override
  ) values (
    p_product_id, p_department_id, p_entry_date, coalesce(p_entry_time, '00:00'),
    p_quantity, v_product.unit, p_notes, (p_allow_override and v_available < p_quantity)
  )
  returning * into v_entry;

  v_remaining_to_allocate := p_quantity;

  for v_batch in
    select * from incoming_batches
    where product_id = p_product_id and not is_void and remaining_quantity > 0
    order by entry_date asc, entry_time asc, created_at asc
    for update
  loop
    exit when v_remaining_to_allocate <= 0;

    v_take := least(v_batch.remaining_quantity, v_remaining_to_allocate);

    insert into outgoing_allocations (outgoing_entry_id, incoming_batch_id, quantity, unit_cost, total_cost)
    values (v_entry.id, v_batch.id, v_take, v_batch.unit_price, round(v_take * v_batch.unit_price, 2));

    update incoming_batches set remaining_quantity = remaining_quantity - v_take where id = v_batch.id;

    v_total_cost := v_total_cost + round(v_take * v_batch.unit_price, 2);
    v_remaining_to_allocate := v_remaining_to_allocate - v_take;
    v_last_batch_id := v_batch.id;
    v_last_unit_price := v_batch.unit_price;
  end loop;

  -- override shortfall: keep drawing from the most recent batch touched
  -- (or the most recent batch overall if none had stock left at all),
  -- letting it go negative rather than inventing a batch.
  if v_remaining_to_allocate > 0 then
    if v_last_batch_id is null then
      select id, unit_price into v_last_batch_id, v_last_unit_price
      from incoming_batches
      where product_id = p_product_id and not is_void
      order by entry_date desc, entry_time desc, created_at desc
      limit 1;
    end if;

    v_shortfall := v_remaining_to_allocate;

    insert into outgoing_allocations (outgoing_entry_id, incoming_batch_id, quantity, unit_cost, total_cost)
    values (v_entry.id, v_last_batch_id, v_shortfall, v_last_unit_price, round(v_shortfall * v_last_unit_price, 2));

    update incoming_batches set remaining_quantity = remaining_quantity - v_shortfall where id = v_last_batch_id;

    v_total_cost := v_total_cost + round(v_shortfall * v_last_unit_price, 2);
  end if;

  update outgoing_entries set total_cost = v_total_cost where id = v_entry.id
  returning * into v_entry;

  return v_entry;
end;
$$;

-- ---------------------------------------------------------------------------
-- fn_void_outgoing_entry: reverses every allocation it made, giving the
-- quantity back to the originating batches, then marks the entry void.
-- ---------------------------------------------------------------------------
create or replace function fn_void_outgoing_entry(p_entry_id uuid, p_reason text)
returns outgoing_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry outgoing_entries;
  v_alloc record;
begin
  select * into v_entry from outgoing_entries where id = p_entry_id for update;
  if not found then
    raise exception 'OUTGOING_ENTRY_NOT_FOUND';
  end if;
  if v_entry.is_void then
    raise exception 'ALREADY_VOID';
  end if;

  for v_alloc in
    select * from outgoing_allocations where outgoing_entry_id = p_entry_id for update
  loop
    update incoming_batches
      set remaining_quantity = remaining_quantity + v_alloc.quantity
      where id = v_alloc.incoming_batch_id;
  end loop;

  update outgoing_entries
    set is_void = true, void_reason = p_reason
    where id = p_entry_id
    returning * into v_entry;

  return v_entry;
end;
$$;

-- ---------------------------------------------------------------------------
-- fn_current_stock: live, per-product snapshot for the Stock / Products pages.
-- ---------------------------------------------------------------------------
create or replace function fn_current_stock()
returns table (
  product_id uuid,
  product_name text,
  unit text,
  status text,
  total_incoming_qty numeric,
  total_outgoing_qty numeric,
  current_stock numeric,
  current_stock_value numeric,
  avg_cost numeric,
  total_purchase_expense numeric,
  total_consumption_expense numeric
)
language sql
stable
as $$
  select
    p.id,
    p.name,
    p.unit,
    p.status,
    coalesce(ib.total_incoming_qty, 0),
    coalesce(oe.total_outgoing_qty, 0),
    coalesce(ib.total_remaining_qty, 0) as current_stock,
    coalesce(ib.total_remaining_value, 0) as current_stock_value,
    case when coalesce(ib.total_remaining_qty, 0) > 0
      then round(ib.total_remaining_value / ib.total_remaining_qty, 4)
      else 0 end as avg_cost,
    coalesce(ib.total_purchase_expense, 0),
    coalesce(oe.total_consumption_expense, 0)
  from products p
  left join (
    select
      product_id,
      sum(quantity) as total_incoming_qty,
      sum(remaining_quantity) as total_remaining_qty,
      sum(remaining_quantity * unit_price) as total_remaining_value,
      sum(total_price) as total_purchase_expense
    from incoming_batches
    where not is_void
    group by product_id
  ) ib on ib.product_id = p.id
  left join (
    select
      product_id,
      sum(quantity) as total_outgoing_qty,
      sum(total_cost) as total_consumption_expense
    from outgoing_entries
    where not is_void
    group by product_id
  ) oe on oe.product_id = p.id
  order by p.name;
$$;

-- ---------------------------------------------------------------------------
-- fn_dashboard_summary: single round-trip for the dashboard tiles.
-- ---------------------------------------------------------------------------
create or replace function fn_dashboard_summary()
returns table (
  total_products bigint,
  total_incoming_qty numeric,
  total_outgoing_qty numeric,
  current_stock_qty numeric,
  current_stock_value numeric,
  total_incoming_expense numeric,
  total_outgoing_expense numeric,
  month_incoming_expense numeric,
  month_outgoing_expense numeric,
  month_incoming_qty numeric,
  month_outgoing_qty numeric,
  month_incoming_entries bigint,
  month_outgoing_entries bigint
)
language sql
stable
as $$
  select
    (select count(*) from products where status = 'active'),
    (select coalesce(sum(quantity), 0) from incoming_batches where not is_void),
    (select coalesce(sum(quantity), 0) from outgoing_entries where not is_void),
    (select coalesce(sum(remaining_quantity), 0) from incoming_batches where not is_void),
    (select coalesce(sum(remaining_quantity * unit_price), 0) from incoming_batches where not is_void),
    (select coalesce(sum(total_price), 0) from incoming_batches where not is_void),
    (select coalesce(sum(total_cost), 0) from outgoing_entries where not is_void),
    (select coalesce(sum(total_price), 0) from incoming_batches
      where not is_void and date_trunc('month', entry_date) = date_trunc('month', current_date)),
    (select coalesce(sum(total_cost), 0) from outgoing_entries
      where not is_void and date_trunc('month', entry_date) = date_trunc('month', current_date)),
    (select coalesce(sum(quantity), 0) from incoming_batches
      where not is_void and date_trunc('month', entry_date) = date_trunc('month', current_date)),
    (select coalesce(sum(quantity), 0) from outgoing_entries
      where not is_void and date_trunc('month', entry_date) = date_trunc('month', current_date)),
    (select count(*) from incoming_batches
      where not is_void and date_trunc('month', entry_date) = date_trunc('month', current_date)),
    (select count(*) from outgoing_entries
      where not is_void and date_trunc('month', entry_date) = date_trunc('month', current_date));
$$;

-- ---------------------------------------------------------------------------
-- fn_product_report_summary: opening/incoming/outgoing/closing per product
-- for an arbitrary [p_from, p_to] range, recomputed from batch + allocation
-- history so it stays correct however prices moved before/after the range.
-- ---------------------------------------------------------------------------
create or replace function fn_product_report_summary(p_from date, p_to date)
returns table (
  product_id uuid,
  product_name text,
  unit text,
  opening_qty numeric,
  opening_value numeric,
  incoming_qty numeric,
  incoming_expense numeric,
  outgoing_qty numeric,
  outgoing_expense numeric,
  closing_qty numeric,
  closing_value numeric
)
language sql
stable
as $$
  with batch_consumed as (
    select
      ib.id as batch_id,
      ib.product_id,
      ib.unit_price,
      ib.quantity,
      ib.entry_date,
      coalesce(sum(oa.quantity) filter (
        where oe.entry_date < p_from and not oe.is_void
      ), 0) as consumed_before,
      coalesce(sum(oa.quantity) filter (
        where oe.entry_date <= p_to and not oe.is_void
      ), 0) as consumed_through
    from incoming_batches ib
    left join outgoing_allocations oa on oa.incoming_batch_id = ib.id
    left join outgoing_entries oe on oe.id = oa.outgoing_entry_id
    where not ib.is_void
    group by ib.id, ib.product_id, ib.unit_price, ib.quantity, ib.entry_date
  ),
  opening as (
    select product_id,
      sum(greatest(quantity - consumed_before, 0)) as opening_qty,
      sum(greatest(quantity - consumed_before, 0) * unit_price) as opening_value
    from batch_consumed
    where entry_date < p_from
    group by product_id
  ),
  closing as (
    select product_id,
      sum(greatest(quantity - consumed_through, 0)) as closing_qty,
      sum(greatest(quantity - consumed_through, 0) * unit_price) as closing_value
    from batch_consumed
    where entry_date <= p_to
    group by product_id
  ),
  incoming_period as (
    select product_id, sum(quantity) as incoming_qty, sum(total_price) as incoming_expense
    from incoming_batches
    where not is_void and entry_date between p_from and p_to
    group by product_id
  ),
  outgoing_period as (
    select product_id, sum(quantity) as outgoing_qty, sum(total_cost) as outgoing_expense
    from outgoing_entries
    where not is_void and entry_date between p_from and p_to
    group by product_id
  )
  select
    p.id, p.name, p.unit,
    coalesce(o.opening_qty, 0), coalesce(o.opening_value, 0),
    coalesce(ip.incoming_qty, 0), coalesce(ip.incoming_expense, 0),
    coalesce(op.outgoing_qty, 0), coalesce(op.outgoing_expense, 0),
    coalesce(c.closing_qty, 0), coalesce(c.closing_value, 0)
  from products p
  left join opening o on o.product_id = p.id
  left join closing c on c.product_id = p.id
  left join incoming_period ip on ip.product_id = p.id
  left join outgoing_period op on op.product_id = p.id
  where p.status = 'active'
     or coalesce(ip.incoming_qty, 0) > 0
     or coalesce(op.outgoing_qty, 0) > 0
     or coalesce(o.opening_qty, 0) > 0
  order by p.name;
$$;

-- ---------------------------------------------------------------------------
-- fn_department_report_summary: per department x product expense/qty for a
-- range, used for Sheet 5 (Department Summary) and the dashboard.
-- ---------------------------------------------------------------------------
create or replace function fn_department_report_summary(p_from date, p_to date)
returns table (
  department_id uuid,
  department_name text,
  product_id uuid,
  product_name text,
  unit text,
  quantity numeric,
  expense numeric,
  transaction_count bigint
)
language sql
stable
as $$
  select
    d.id, d.name, p.id, p.name, oe.unit,
    sum(oe.quantity), sum(oe.total_cost), count(*)
  from outgoing_entries oe
  join departments d on d.id = oe.department_id
  join products p on p.id = oe.product_id
  where not oe.is_void and oe.entry_date between p_from and p_to
  group by d.id, d.name, p.id, p.name, oe.unit
  order by d.name, p.name;
$$;

-- ---------------------------------------------------------------------------
-- fn_daily_activity: raw per-day incoming/outgoing per product; the report
-- generator walks this day-by-day to build running opening/closing columns.
-- ---------------------------------------------------------------------------
create or replace function fn_daily_activity(p_from date, p_to date)
returns table (
  entry_date date,
  product_id uuid,
  incoming_qty numeric,
  outgoing_qty numeric
)
language sql
stable
as $$
  select entry_date, product_id, sum(qty_in), sum(qty_out)
  from (
    select entry_date, product_id, quantity as qty_in, 0::numeric as qty_out
    from incoming_batches
    where not is_void and entry_date between p_from and p_to
    union all
    select entry_date, product_id, 0::numeric as qty_in, quantity as qty_out
    from outgoing_entries
    where not is_void and entry_date between p_from and p_to
  ) x
  group by entry_date, product_id
  order by entry_date, product_id;
$$;
