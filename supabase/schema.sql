-- Restoran QR menü için örnek şema. Supabase SQL Editor'da çalıştırın.

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null,
  price_one_half numeric(10,2),
  price_double numeric(10,2),
  image_url text,
  is_spicy boolean not null default false,
  is_vegan boolean not null default false,
  is_gluten_free boolean not null default false,
  is_available boolean not null default true
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  table_number text not null,
  items jsonb not null,
  total_amount numeric(10,2) not null,
  notes text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'preparing', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists table_calls (
  id uuid primary key default gen_random_uuid(),
  table_number text not null,
  call_type text not null check (call_type in ('waiter', 'bill')),
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table categories enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table table_calls enable row level security;

create policy "public read categories" on categories for select using (true);
create policy "public read products" on products for select using (true);
create policy "public create orders" on orders for insert with check (status = 'pending');
create policy "public read orders" on orders for select using (true);
create policy "public create table calls" on table_calls for insert with check (true);

-- Canlı sipariş takibi için orders tablosunda Realtime açık olmalı.
alter publication supabase_realtime add table orders;
