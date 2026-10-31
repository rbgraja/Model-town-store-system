-- ============================================================================
-- Report fix: opening/closing must balance with the period's in/out.
--
-- Before: opening & closing were derived from FIFO batch layers
-- (incoming_batches x outgoing_allocations), while incoming/outgoing were
-- summed by entry_date. FIFO allocation ignores dates, so a back-dated
-- outgoing (e.g. issue dated 31 Aug that drew from a batch purchased 15 Sep)
-- consumed the batch in the closing figure but was never counted as September
-- outgoing. Result: Opening + Incoming - Outgoing <> Closing (Rs 5,750 off in
-- Sept 2026 for "Pistachio 500gm").
--
-- Now: everything is a date-based ledger over non-void rows, so every product
-- row satisfies  opening + incoming - outgoing = closing  by construction.
-- A back-dated issue that pre-dates its purchase shows up as a NEGATIVE
-- opening for that product instead of silently vanishing.
--
-- Signature is unchanged; existing grants are preserved by CREATE OR REPLACE.
-- ============================================================================

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
  with in_before as (
    select product_id, sum(quantity) as qty, sum(total_price) as val
    from incoming_batches
    where not is_void and entry_date < p_from
    group by product_id
  ),
  out_before as (
    select product_id, sum(quantity) as qty, sum(total_cost) as val
    from outgoing_entries
    where not is_void and entry_date < p_from
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
  ),
  ledger as (
    select
      p.id as product_id,
      coalesce(ib.qty, 0) - coalesce(ob.qty, 0) as opening_qty,
      coalesce(ib.val, 0) - coalesce(ob.val, 0) as opening_value,
      coalesce(ip.incoming_qty, 0)     as incoming_qty,
      coalesce(ip.incoming_expense, 0) as incoming_expense,
      coalesce(op.outgoing_qty, 0)     as outgoing_qty,
      coalesce(op.outgoing_expense, 0) as outgoing_expense
    from products p
    left join in_before ib on ib.product_id = p.id
    left join out_before ob on ob.product_id = p.id
    left join incoming_period ip on ip.product_id = p.id
    left join outgoing_period op on op.product_id = p.id
  )
  select
    p.id, p.name, p.unit,
    p.category_id, c.name, c.color_hex, coalesce(c.sort_order, 9999),
    l.opening_qty, l.opening_value,
    l.incoming_qty, l.incoming_expense,
    l.outgoing_qty, l.outgoing_expense,
    l.opening_qty + l.incoming_qty - l.outgoing_qty,
    l.opening_value + l.incoming_expense - l.outgoing_expense
  from products p
  join ledger l on l.product_id = p.id
  left join categories c on c.id = p.category_id
  where p.status = 'active'
     or l.incoming_qty > 0
     or l.outgoing_qty > 0
     or l.opening_qty <> 0
  order by coalesce(c.sort_order, 9999), p.name;
$$;
