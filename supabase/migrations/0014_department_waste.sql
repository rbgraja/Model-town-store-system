-- ============================================================================
-- Department waste. Waste is recorded exactly like usage (same table, same
-- per-day replace behaviour) but tagged kind = 'waste'. It reduces what the
-- department holds, and fn_department_stock reports it with a money value
-- (waste qty x the department's average issue cost for that product).
-- ============================================================================

alter table department_usage
  add column if not exists kind text not null default 'used'
  check (kind in ('used', 'waste'));

-- ---------------------------------------------------------------------------
-- fn_set_department_usage: now takes the kind. Replaces only rows of the same
-- (department, product, date, kind); the stock check counts used + waste.
-- ---------------------------------------------------------------------------
drop function if exists fn_set_department_usage(uuid, uuid, date, numeric);

create or replace function fn_set_department_usage(
  p_department_id uuid,
  p_product_id    uuid,
  p_entry_date    date,
  p_quantity      numeric,
  p_kind          text default 'used'
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit text;
  v_balance numeric;
begin
  if p_kind not in ('used', 'waste') then
    raise exception 'INVALID_KIND';
  end if;
  if p_quantity is null or p_quantity < 0 then
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

  update department_usage
    set is_void = true, void_reason = 'Replaced by corrected entry'
    where department_id = p_department_id and product_id = p_product_id
      and entry_date = p_entry_date and kind = p_kind and not is_void;

  if p_quantity = 0 then
    return;
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

  insert into department_usage (department_id, product_id, entry_date, quantity, unit, kind)
  values (p_department_id, p_product_id, p_entry_date, p_quantity, v_unit, p_kind);
end;
$$;

revoke execute on function fn_set_department_usage(uuid, uuid, date, numeric, text) from public;
grant execute on function fn_set_department_usage(uuid, uuid, date, numeric, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- fn_department_stock: adds waste_qty and waste_value.
--   remaining = opening + received - used - waste
--   waste_value = waste_qty x (total issue cost / total issued qty) for that
--                 department+product up to p_to
-- ---------------------------------------------------------------------------
drop function if exists fn_department_stock(date, date);

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
  waste_qty       numeric,
  waste_value     numeric,
  remaining_qty   numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with issued as (
    select department_id, product_id, entry_date, quantity, total_cost
      from outgoing_entries where not is_void
    union all
    select department_id, product_id, entry_date, quantity, total_cost
      from outgoing_entries_archive where not is_void
  ),
  avg_cost as (
    select department_id, product_id,
           sum(total_cost) / nullif(sum(quantity), 0) as unit_cost
    from issued where entry_date <= p_to
    group by department_id, product_id
  ),
  used as (
    select department_id, product_id, entry_date, quantity, kind
      from department_usage where not is_void
  ),
  moves as (
    select department_id, product_id,
      case when entry_date < p_from then quantity else 0 end as open_in,
      case when entry_date between p_from and p_to then quantity else 0 end as recv,
      0::numeric as open_out, 0::numeric as used_q, 0::numeric as waste_q
    from issued where entry_date <= p_to
    union all
    select department_id, product_id, 0, 0,
      case when entry_date < p_from then quantity else 0 end,
      case when kind = 'used'  and entry_date between p_from and p_to then quantity else 0 end,
      case when kind = 'waste' and entry_date between p_from and p_to then quantity else 0 end
    from used where entry_date <= p_to
  ),
  agg as (
    select department_id, product_id,
      sum(open_in) - sum(open_out) as opening,
      sum(recv) as received,
      sum(used_q) as used_total,
      sum(waste_q) as waste_total
    from moves group by department_id, product_id
  )
  select d.id, d.name, p.id, p.name, p.unit,
    a.opening, a.received, a.used_total, a.waste_total,
    round(a.waste_total * coalesce(c.unit_cost, 0), 2),
    a.opening + a.received - a.used_total - a.waste_total
  from agg a
  join departments d on d.id = a.department_id
  join products p on p.id = a.product_id
  left join avg_cost c on c.department_id = a.department_id and c.product_id = a.product_id
  where a.opening <> 0 or a.received <> 0 or a.used_total <> 0 or a.waste_total <> 0
  order by d.name, p.name;
$$;

revoke execute on function fn_department_stock(date, date) from public;
grant execute on function fn_department_stock(date, date) to authenticated, service_role;
