-- ============================================================================
-- Department / product admin functions (rename, unit change, activate/deactivate)
-- Deactivating rather than deleting is enforced here: there is no
-- fn_delete_department / fn_delete_product at all, only status toggles, so
-- historical incoming/outgoing rows never lose their foreign key target.
-- ============================================================================

create or replace function fn_update_department(
  p_id uuid,
  p_name text,
  p_status text
)
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
  if p_status not in ('active', 'inactive') then
    raise exception 'INVALID_STATUS';
  end if;

  update departments
    set name = trim(p_name), status = p_status
    where id = p_id
    returning * into v_row;

  if not found then
    raise exception 'DEPARTMENT_NOT_FOUND';
  end if;

  return v_row;
exception
  when unique_violation then
    raise exception 'DEPARTMENT_NAME_ALREADY_EXISTS';
end;
$$;

create or replace function fn_update_product(
  p_id uuid,
  p_name text,
  p_unit text,
  p_status text
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
    set name = trim(p_name), unit = trim(p_unit), status = p_status
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

grant execute on function
  fn_update_department(uuid, text, text),
  fn_update_product(uuid, text, text, text)
to authenticated;
