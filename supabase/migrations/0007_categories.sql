-- ============================================================================
-- Product categories
--
-- Adds a `categories` table (like `departments` — user-manageable), and a
-- nullable `category_id` on `products`. Reports and the Products page group
-- and colour rows by category. A product with no category is treated as
-- "Uncategorized" and always appears at the very bottom of any grouped view.
--
-- The `color_hex` column carries a 6-hex background used both by the app UI
-- (as inline style) and by the xlsx generator (as ExcelJS fill argb, prefixed
-- with FF for alpha). `sort_order` decides the group order in every export
-- and in the calendar heatmap grouping.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table if not exists categories (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  normalized_name text generated always as (lower(trim(name))) stored,
  color_hex       text not null default 'E5E7EB'
                  check (color_hex ~ '^[0-9A-Fa-f]{6}$'),
  sort_order      int  not null default 100,
  status          text not null default 'active'
                  check (status in ('active', 'inactive')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists categories_normalized_name_key
  on categories (normalized_name);

drop trigger if exists set_updated_at on categories;
create trigger set_updated_at before update on categories
  for each row execute function trg_set_updated_at();

-- ---------------------------------------------------------------------------
-- products.category_id  (nullable — legacy products keep working)
-- ---------------------------------------------------------------------------
alter table products
  add column if not exists category_id uuid
    references categories(id) on delete set null;

create index if not exists products_category_id_idx
  on products (category_id);

-- ---------------------------------------------------------------------------
-- Seed the default category set. sort_order is chosen so related categories
-- sit next to each other in the export (dry / wet / dairy / meat / produce
-- / bread / bev / prepared / cleaning / packaging). Colors are muted pastel
-- fills that stay readable in Excel and in the browser.
-- ---------------------------------------------------------------------------
insert into categories (name, color_hex, sort_order) values
  ('General & Grains',           'FEF3C7',  10),
  ('Spices & Seasonings',        'FDE68A',  20),
  ('Sauces & Condiments',        'FCA5A5',  30),
  ('Baking & Confectionery',     'FBCFE8',  40),
  ('Dairy, Cheese & Eggs',       'FEF9C3',  50),
  ('Dry Goods, Nuts & Legumes',  'D9F99D',  60),
  ('Preserves & Jams',           'FED7AA',  70),
  ('Canned & Preserved',         'E9D5FF',  80),
  ('Meat & Poultry',             'FECACA',  90),
  ('Vegetables',                 'BBF7D0', 100),
  ('Fruits',                     'FEE2E2', 110),
  ('Bread',                      'FDE68A', 120),
  ('Beverages',                  'BAE6FD', 130),
  ('Frozen & Prepared',          'C7D2FE', 140),
  ('Cleaning & Dishwashing',     'E0F2FE', 150),
  ('Packaging & Disposables',    'F3F4F6', 160)
on conflict (normalized_name) do nothing;

-- ---------------------------------------------------------------------------
-- Drop the old function signatures whose shape is about to change. Postgres
-- refuses CREATE OR REPLACE when either the return type (OUT params) or
-- argument list differs from the currently-installed function — the safe,
-- idempotent fix is DROP FUNCTION IF EXISTS with the exact argument list
-- of the OLD signature (from 0002/0005), so a fresh install (where these
-- functions don't exist yet) still works.
-- ---------------------------------------------------------------------------
drop function if exists fn_upsert_product(text, text);
drop function if exists fn_update_product(uuid, text, text, text);
drop function if exists fn_current_stock();
drop function if exists fn_product_report_summary(date, date);

-- ---------------------------------------------------------------------------
-- fn_upsert_category  (create/rename a category)
-- ---------------------------------------------------------------------------
create or replace function fn_upsert_category(
  p_name text,
  p_color_hex text default null,
  p_sort_order int default null
)
returns categories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row categories;
begin
  if p_name is null or trim(p_name) = '' then
    raise exception 'CATEGORY_NAME_REQUIRED';
  end if;
  if p_color_hex is not null and p_color_hex !~ '^[0-9A-Fa-f]{6}$' then
    raise exception 'CATEGORY_COLOR_INVALID';
  end if;

  insert into categories (name, color_hex, sort_order)
  values (
    trim(p_name),
    coalesce(p_color_hex, 'E5E7EB'),
    coalesce(p_sort_order, 100)
  )
  on conflict (normalized_name) do update
    set updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- fn_update_category (rename / recolor / reorder / activate-deactivate)
-- ---------------------------------------------------------------------------
create or replace function fn_update_category(
  p_id uuid,
  p_name text,
  p_color_hex text,
  p_sort_order int,
  p_status text
)
returns categories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row categories;
begin
  if p_name is null or trim(p_name) = '' then
    raise exception 'CATEGORY_NAME_REQUIRED';
  end if;
  if p_color_hex !~ '^[0-9A-Fa-f]{6}$' then
    raise exception 'CATEGORY_COLOR_INVALID';
  end if;
  if p_status not in ('active','inactive') then
    raise exception 'INVALID_STATUS';
  end if;

  update categories
    set name = trim(p_name),
        color_hex = p_color_hex,
        sort_order = coalesce(p_sort_order, 100),
        status = p_status
    where id = p_id
    returning * into v_row;

  if not found then
    raise exception 'CATEGORY_NOT_FOUND';
  end if;

  return v_row;
exception
  when unique_violation then
    raise exception 'CATEGORY_NAME_ALREADY_EXISTS';
end;
$$;

-- ---------------------------------------------------------------------------
-- fn_upsert_product now accepts an optional category id.
-- Existing callers (fn_create_incoming_batch) that pass only name+unit keep
-- working — the category is left as whatever the product already had.
-- ---------------------------------------------------------------------------
create or replace function fn_upsert_product(
  p_name text,
  p_unit text,
  p_category_id uuid default null
)
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

  insert into products (name, unit, category_id)
  values (trim(p_name), trim(p_unit), p_category_id)
  on conflict (normalized_name) do update
    set updated_at = now(),
        category_id = coalesce(excluded.category_id, products.category_id)
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- fn_update_product now sets/changes category too.
-- ---------------------------------------------------------------------------
create or replace function fn_update_product(
  p_id uuid,
  p_name text,
  p_unit text,
  p_status text,
  p_category_id uuid default null
)
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
  if p_status not in ('active', 'inactive') then
    raise exception 'INVALID_STATUS';
  end if;

  update products
    set name = trim(p_name),
        unit = trim(p_unit),
        status = p_status,
        category_id = p_category_id
    where id = p_id
    returning * into v_row;

  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  return v_row;
exception
  when unique_violation then
    raise exception 'PRODUCT_NAME_ALREADY_EXISTS';
end;
$$;

-- ---------------------------------------------------------------------------
-- fn_current_stock now also returns category info so the Products / Stock
-- pages can group and colour rows without a separate round-trip.
-- ---------------------------------------------------------------------------
create or replace function fn_current_stock()
returns table (
  product_id uuid,
  product_name text,
  unit text,
  status text,
  category_id uuid,
  category_name text,
  category_color text,
  category_sort int,
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
    p.category_id,
    c.name,
    c.color_hex,
    coalesce(c.sort_order, 9999),
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
  left join categories c on c.id = p.category_id
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
  order by coalesce(c.sort_order, 9999), p.name;
$$;

-- ---------------------------------------------------------------------------
-- fn_product_report_summary now also returns category info and — critically
-- — includes ALL active products, even those with zero movement in the
-- range (so xlsx exports list every product like the paper register does).
-- ---------------------------------------------------------------------------
create or replace function fn_product_report_summary(p_from date, p_to date)
returns table (
  product_id uuid,
  product_name text,
  unit text,
  category_id uuid,
  category_name text,
  category_color text,
  category_sort int,
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
    p.category_id, c.name, c.color_hex, coalesce(c.sort_order, 9999),
    coalesce(o.opening_qty, 0), coalesce(o.opening_value, 0),
    coalesce(ip.incoming_qty, 0), coalesce(ip.incoming_expense, 0),
    coalesce(op.outgoing_qty, 0), coalesce(op.outgoing_expense, 0),
    coalesce(c2.closing_qty, 0), coalesce(c2.closing_value, 0)
  from products p
  left join categories c on c.id = p.category_id
  left join opening o on o.product_id = p.id
  left join closing c2 on c2.product_id = p.id
  left join incoming_period ip on ip.product_id = p.id
  left join outgoing_period op on op.product_id = p.id
  where p.status = 'active'
     or coalesce(ip.incoming_qty, 0) > 0
     or coalesce(op.outgoing_qty, 0) > 0
     or coalesce(o.opening_qty, 0) > 0
  order by coalesce(c.sort_order, 9999), p.name;
$$;

-- ---------------------------------------------------------------------------
-- fn_product_calendar: per-product daily in/out heatmap for [from, to].
-- Returns one row per (date, product) with any movement in the range plus
-- the product's running opening/closing for that day. Rows with zero
-- movement are OMITTED so the client can draw a sparse calendar.
-- ---------------------------------------------------------------------------
create or replace function fn_product_calendar(p_product_id uuid, p_from date, p_to date)
returns table (
  entry_date date,
  incoming_qty numeric,
  outgoing_qty numeric,
  incoming_expense numeric,
  outgoing_expense numeric
)
language sql
stable
as $$
  with days as (
    select entry_date,
           sum(quantity)      as incoming_qty,
           sum(total_price)   as incoming_expense,
           0::numeric         as outgoing_qty,
           0::numeric         as outgoing_expense
    from incoming_batches
    where not is_void
      and product_id = p_product_id
      and entry_date between p_from and p_to
    group by entry_date
    union all
    select entry_date,
           0::numeric,
           0::numeric,
           sum(quantity),
           sum(total_cost)
    from outgoing_entries
    where not is_void
      and product_id = p_product_id
      and entry_date between p_from and p_to
    group by entry_date
  )
  select entry_date,
         sum(incoming_qty),
         sum(outgoing_qty),
         sum(incoming_expense),
         sum(outgoing_expense)
  from days
  group by entry_date
  order by entry_date;
$$;

-- ---------------------------------------------------------------------------
-- Grants (mirrors 0004_rls.sql). RLS on categories: read-only for
-- authenticated, all writes through SECURITY DEFINER functions.
-- ---------------------------------------------------------------------------
alter table categories enable row level security;

create policy "authenticated_read_categories" on categories
  for select to authenticated using (true);

revoke insert, update, delete on categories from authenticated;

grant execute on function
  fn_upsert_category(text, text, int),
  fn_update_category(uuid, text, text, int, text),
  fn_upsert_product(text, text, uuid),
  fn_update_product(uuid, text, text, text, uuid),
  fn_current_stock(),
  fn_product_report_summary(date, date),
  fn_product_calendar(uuid, date, date)
to authenticated;
