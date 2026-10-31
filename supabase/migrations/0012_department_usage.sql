-- ============================================================================
-- Department usage tracking.
--   * Outgoing = stock issued TO a department (expense is booked at issue, as
--     before — unchanged).
--   * department_usage = what the department actually used out of it.
--   * Department balance = issued - used. Because it is a running total, the
--     balance left at the end of a month is automatically the next month's
--     opening quantity — nothing needs to be "rolled over" by hand.
-- Issued quantities also read outgoing_entries_archive so a yearly archive
-- never wipes a department's carried-forward balance.
-- ============================================================================

create table if not exists department_usage (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id) on delete restrict,
  product_id    uuid not null references products(id) on delete restrict,
  entry_date    date not null,
  quantity      numeric(14,3) not null check (quantity > 0),
  unit          text not null,
  notes         text,
  is_void       boolean not null default false,
  void_reason   text,
  created_at    timestamptz not null default now()
);

create index if not exists department_usage_dept_product_date_idx
  on department_usage (department_id, product_id, entry_date);

alter table department_usage enable row level security;
create policy "authenticated_read_department_usage" on department_usage
  for select to authenticated using (true);
revoke insert, update, delete on department_usage from authenticated;

-- ---------------------------------------------------------------------------
create or replace function fn_create_department_usage(
  p_department_id uuid,
  p_product_id    uuid,
  p_quantity      numeric,
  p_entry_date    date,
  p_notes         text default null
) returns department_usage
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit text;
  v_balance numeric;
  v_row department_usage;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'QUANTITY_MUST_BE_POSITIVE';
  end if;
  if p_entry_date is null then
    raise exception 'DATE_REQUIRED';
  end if;
  select unit into v_unit from products where id = p_product_id;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;
  if not exists (select 1 from departments where id = p_department_id) then
    raise exception 'DEPARTMENT_NOT_FOUND';
  end if;

  select
    coalesce((select sum(quantity) from outgoing_entries
              where department_id = p_department_id and product_id = p_product_id
                and not is_void and entry_date <= p_entry_date), 0)
    + coalesce((select sum(quantity) from outgoing_entries_archive
              where department_id = p_department_id and product_id = p_product_id
                and not is_void and entry_date <= p_entry_date), 0)
    - coalesce((select sum(quantity) from department_usage
              where department_id = p_department_id and product_id = p_product_id
                and not is_void), 0)
  into v_balance;

  if p_quantity > v_balance then
    raise exception 'INSUFFICIENT_DEPARTMENT_STOCK: department only has % % available', v_balance, v_unit;
  end if;

  insert into department_usage (department_id, product_id, entry_date, quantity, unit, notes)
  values (p_department_id, p_product_id, p_entry_date, p_quantity, v_unit, p_notes)
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function fn_void_department_usage(p_id uuid, p_reason text)
returns department_usage
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row department_usage;
begin
  update department_usage set is_void = true, void_reason = p_reason
    where id = p_id and not is_void
    returning * into v_row;
  if not found then
    raise exception 'ALREADY_VOID';
  end if;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- fn_department_stock: per department x product for [p_from, p_to].
--   opening   = issued before p_from - used before p_from   (= last month's remaining)
--   received  = issued within the period
--   used      = usage within the period
--   remaining = opening + received - used
-- ---------------------------------------------------------------------------
create or replace function fn_department_stock(p_from date, p_to date)
returns table (
  department_id   uuid,
  department_name text,
  product_id      uuid,
  product_name    text,
  unit            text,
  opening_qty     numeric,
  received_qty    numeric,
  used_qty        numeric,
  remaining_qty   numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with issued as (
    select department_id, product_id, entry_date, quantity from outgoing_entries where not is_void
    union all
    select department_id, product_id, entry_date, quantity from outgoing_entries_archive where not is_void
  ),
  used as (
    select department_id, product_id, entry_date, quantity from department_usage where not is_void
  ),
  moves as (
    select department_id, product_id,
      case when entry_date < p_from then quantity else 0 end as open_in,
      case when entry_date between p_from and p_to then quantity else 0 end as recv,
      0::numeric as open_out, 0::numeric as used_q
    from issued where entry_date <= p_to
    union all
    select department_id, product_id, 0, 0,
      case when entry_date < p_from then quantity else 0 end,
      case when entry_date between p_from and p_to then quantity else 0 end
    from used where entry_date <= p_to
  ),
  agg as (
    select department_id, product_id,
      sum(open_in) - sum(open_out) as opening,
      sum(recv) as received,
      sum(used_q) as used_total
    from moves group by department_id, product_id
  )
  select d.id, d.name, p.id, p.name, p.unit,
    a.opening, a.received, a.used_total, a.opening + a.received - a.used_total
  from agg a
  join departments d on d.id = a.department_id
  join products p on p.id = a.product_id
  where a.opening <> 0 or a.received <> 0 or a.used_total <> 0
  order by d.name, p.name;
$$;

revoke execute on function
  fn_create_department_usage(uuid, uuid, numeric, date, text),
  fn_void_department_usage(uuid, text),
  fn_department_stock(date, date)
from public;
grant execute on function
  fn_create_department_usage(uuid, uuid, numeric, date, text),
  fn_void_department_usage(uuid, text),
  fn_department_stock(date, date)
to authenticated, service_role;
