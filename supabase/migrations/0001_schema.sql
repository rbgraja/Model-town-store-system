-- ============================================================================
-- Store Management System — core schema
-- ============================================================================
-- Design notes:
--   * "incoming_batches" is both the purchase entry AND the FIFO cost batch —
--     there is no separate ledger, the batch itself carries remaining_quantity
--     so costing never needs to replay history.
--   * "outgoing_allocations" is the FIFO audit trail: one row per
--     (outgoing_entry, incoming_batch) pair consumed, at the batch's own cost.
--   * All monetary values are numeric(14,2), quantities numeric(14,3) to
--     tolerate gram/ml-level precision.
--   * Archive tables mirror the live tables exactly so historical queries and
--     report generation keep working after a year is archived.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- departments
-- ---------------------------------------------------------------------------
create table if not exists departments (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  normalized_name text generated always as (lower(trim(name))) stored,
  status       text not null default 'active' check (status in ('active', 'inactive')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists departments_normalized_name_key
  on departments (normalized_name);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  normalized_name text generated always as (lower(trim(name))) stored,
  unit           text not null,
  status         text not null default 'active' check (status in ('active', 'inactive')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists products_normalized_name_key
  on products (normalized_name);

-- ---------------------------------------------------------------------------
-- incoming_batches  (purchase entry + FIFO cost batch)
-- ---------------------------------------------------------------------------
create table if not exists incoming_batches (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid not null references products(id) on delete restrict,
  entry_date         date not null,
  entry_time         time not null default '00:00',
  quantity           numeric(14,3) not null check (quantity > 0),
  remaining_quantity numeric(14,3) not null check (remaining_quantity >= 0),
  unit               text not null,
  total_price        numeric(14,2) not null check (total_price >= 0),
  unit_price         numeric(14,4) not null check (unit_price >= 0),
  receipt_url        text,
  receipt_path       text,
  is_void            boolean not null default false,
  void_reason        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint incoming_batches_remaining_le_quantity check (remaining_quantity <= quantity)
);

create index if not exists incoming_batches_product_date_idx
  on incoming_batches (product_id, entry_date, entry_time, created_at);
create index if not exists incoming_batches_date_idx on incoming_batches (entry_date);
create index if not exists incoming_batches_remaining_idx
  on incoming_batches (product_id, remaining_quantity) where remaining_quantity > 0 and not is_void;

-- ---------------------------------------------------------------------------
-- outgoing_entries  (issue to a department)
-- ---------------------------------------------------------------------------
create table if not exists outgoing_entries (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete restrict,
  department_id uuid not null references departments(id) on delete restrict,
  entry_date    date not null,
  entry_time    time not null default '00:00',
  quantity      numeric(14,3) not null check (quantity > 0),
  unit          text not null,
  total_cost    numeric(14,2) not null default 0,
  notes         text,
  is_override   boolean not null default false,
  is_void       boolean not null default false,
  void_reason   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists outgoing_entries_product_date_idx
  on outgoing_entries (product_id, entry_date);
create index if not exists outgoing_entries_department_date_idx
  on outgoing_entries (department_id, entry_date);
create index if not exists outgoing_entries_date_idx on outgoing_entries (entry_date);

-- ---------------------------------------------------------------------------
-- outgoing_allocations  (FIFO trace: which batch supplied how much)
-- ---------------------------------------------------------------------------
create table if not exists outgoing_allocations (
  id                uuid primary key default gen_random_uuid(),
  outgoing_entry_id uuid not null references outgoing_entries(id) on delete cascade,
  incoming_batch_id uuid not null references incoming_batches(id) on delete restrict,
  quantity          numeric(14,3) not null check (quantity > 0),
  unit_cost         numeric(14,4) not null check (unit_cost >= 0),
  total_cost        numeric(14,2) not null check (total_cost >= 0),
  created_at        timestamptz not null default now()
);

create index if not exists outgoing_allocations_entry_idx
  on outgoing_allocations (outgoing_entry_id);
create index if not exists outgoing_allocations_batch_idx
  on outgoing_allocations (incoming_batch_id);

-- ---------------------------------------------------------------------------
-- yearly_archives
-- ---------------------------------------------------------------------------
create table if not exists yearly_archives (
  id           uuid primary key default gen_random_uuid(),
  year         int not null unique,
  file_name    text not null,
  file_url     text not null,
  file_path    text not null,
  status       text not null default 'completed' check (status in ('generating', 'completed', 'failed')),
  entries_archived_incoming int not null default 0,
  entries_archived_outgoing int not null default 0,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- archive tables (identical shape to the live tables, no FKs to keep them
-- independently readable even if a referenced product/department is later
-- pruned — they are historical snapshots, not live relational data)
-- ---------------------------------------------------------------------------
create table if not exists incoming_batches_archive (
  id                 uuid primary key,
  product_id         uuid not null,
  product_name       text not null,
  entry_date         date not null,
  entry_time         time not null,
  quantity           numeric(14,3) not null,
  remaining_quantity numeric(14,3) not null,
  unit               text not null,
  total_price        numeric(14,2) not null,
  unit_price         numeric(14,4) not null,
  receipt_url        text,
  receipt_path       text,
  is_void            boolean not null default false,
  void_reason        text,
  created_at         timestamptz not null,
  archived_year      int not null,
  archived_at        timestamptz not null default now()
);
create index if not exists incoming_batches_archive_product_idx on incoming_batches_archive (product_id, entry_date);
create index if not exists incoming_batches_archive_year_idx on incoming_batches_archive (archived_year);

create table if not exists outgoing_entries_archive (
  id            uuid primary key,
  product_id    uuid not null,
  product_name  text not null,
  department_id uuid not null,
  department_name text not null,
  entry_date    date not null,
  entry_time    time not null,
  quantity      numeric(14,3) not null,
  unit          text not null,
  total_cost    numeric(14,2) not null,
  notes         text,
  is_override   boolean not null default false,
  is_void       boolean not null default false,
  void_reason   text,
  created_at    timestamptz not null,
  archived_year int not null,
  archived_at   timestamptz not null default now()
);
create index if not exists outgoing_entries_archive_product_idx on outgoing_entries_archive (product_id, entry_date);
create index if not exists outgoing_entries_archive_department_idx on outgoing_entries_archive (department_id, entry_date);
create index if not exists outgoing_entries_archive_year_idx on outgoing_entries_archive (archived_year);

create table if not exists outgoing_allocations_archive (
  id                uuid primary key,
  outgoing_entry_id uuid not null,
  incoming_batch_id uuid not null,
  quantity          numeric(14,3) not null,
  unit_cost         numeric(14,4) not null,
  total_cost        numeric(14,2) not null,
  created_at        timestamptz not null,
  archived_year     int not null,
  archived_at       timestamptz not null default now()
);
create index if not exists outgoing_allocations_archive_entry_idx on outgoing_allocations_archive (outgoing_entry_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function trg_set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on departments;
create trigger set_updated_at before update on departments
  for each row execute function trg_set_updated_at();

drop trigger if exists set_updated_at on products;
create trigger set_updated_at before update on products
  for each row execute function trg_set_updated_at();

drop trigger if exists set_updated_at on incoming_batches;
create trigger set_updated_at before update on incoming_batches
  for each row execute function trg_set_updated_at();

drop trigger if exists set_updated_at on outgoing_entries;
create trigger set_updated_at before update on outgoing_entries
  for each row execute function trg_set_updated_at();
