-- =============================================================================
-- Rovr — Initial schema
-- Creates customers, routes, visits with RLS, indexes, and updated_at trigger.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- CUSTOMERS
-- -----------------------------------------------------------------------------
create table customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  customer_name text not null,
  latitude float8 not null,
  longitude float8 not null,
  sales_value numeric(12,2),
  priority int check (priority between 0 and 10),
  last_visit_days int,
  potential_score float4,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- ROUTES
-- -----------------------------------------------------------------------------
create table routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text,
  optimized_order uuid[],
  total_distance_km float4,
  estimated_duration_min int,
  created_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- VISITS
-- -----------------------------------------------------------------------------
create table visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  route_id uuid references routes(id) on delete set null,
  visited_at timestamptz default now(),
  notes text
);

-- -----------------------------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------------------------
create index customers_user_id_idx on customers(user_id);
create index routes_user_id_idx on routes(user_id);
create index visits_user_id_idx on visits(user_id);
create index visits_customer_id_idx on visits(customer_id);

-- -----------------------------------------------------------------------------
-- UPDATED_AT TRIGGER (customers only — routes/visits don't have updated_at)
-- -----------------------------------------------------------------------------
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
before update on customers
for each row execute function update_updated_at();

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table customers enable row level security;
alter table routes    enable row level security;
alter table visits    enable row level security;

-- Policies — users can only access rows they own.
create policy "users see own customers" on customers
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users see own routes" on routes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users see own visits" on visits
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
