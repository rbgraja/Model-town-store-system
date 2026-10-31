-- ============================================================================
-- fn_set_department_usage: sets (replaces) one department's usage of one
-- product on one date. Existing non-void rows for that exact
-- (department, product, date) are voided and, if p_quantity > 0, a single new
-- row is inserted. Quantity 0 simply clears that day's usage. Runs in one
-- transaction, so a failed stock check leaves the old entry untouched.
-- ============================================================================
create or replace function fn_set_department_usage(
  p_department_id uuid,
  p_product_id    uuid,
  p_entry_date    date,
  p_quantity      numeric
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit text;
  v_balance numeric;
begin
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
      and entry_date = p_entry_date and not is_void;

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

  insert into department_usage (department_id, product_id, entry_date, quantity, unit)
  values (p_department_id, p_product_id, p_entry_date, p_quantity, v_unit);
end;
$$;

revoke execute on function fn_set_department_usage(uuid, uuid, date, numeric) from public;
grant execute on function fn_set_department_usage(uuid, uuid, date, numeric)
  to authenticated, service_role;
