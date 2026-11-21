-- ==============================================================================
-- INAYA FASHION — SUPABASE POSTGRESQL SCHEMA, RLS POLICIES & PUBLIC RPCs
-- Project ID: mtngwbrcywmmxfwrumxb
-- Run this script in Supabase Dashboard -> SQL Editor
-- (Safe to re-run multiple times)
-- ==============================================================================

create extension if not exists "pgcrypto";

-- 1. Store Settings (singleton row id = 1)
create table if not exists public.store_settings (
  id integer primary key default 1,
  store_name text not null default 'Inaya Fashion',
  topbar_enabled boolean not null default true,
  topbar_text text not null default 'Free nationwide delivery on orders over ৳2,500 · Cash on Delivery across Bangladesh · New Ribbed Knitwear Collection Live',
  delivery_enabled boolean not null default true,
  delivery_inside_dhaka integer not null default 70,
  delivery_outside_dhaka integer not null default 130,
  free_delivery_threshold integer not null default 2500,
  social_links jsonb not null default '{"facebook":"https://facebook.com","instagram":"https://instagram.com","tiktok":"https://tiktok.com","whatsapp":"https://wa.me/8801700000000","youtube":""}'::jsonb,
  meta_pixel_id text default '',
  meta_capi_token text default '',
  meta_test_event_code text default '',
  steadfast_base_url text not null default 'https://portal.packzy.com/api/v1',
  steadfast_api_key text default '',
  steadfast_secret_key text default '',
  steadfast_sandbox_mode boolean not null default true,
  updated_at timestamptz not null default now()
);

-- 2. Categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text default '',
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 3. Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category_id uuid references public.categories(id) on delete set null,
  description text not null default '',
  fabric_care text default '',
  price integer not null,
  compare_at_price integer,
  images jsonb not null default '[]'::jsonb,
  sizes jsonb not null default '[]'::jsonb,
  colors jsonb not null default '[]'::jsonb,
  coming_soon boolean not null default false,
  show_on_homepage boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Product Reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  reviewer_name text not null,
  location text default 'Dhaka',
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  verified_purchase boolean not null default true,
  created_at timestamptz not null default now()
);

-- 5. Coupons
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value integer not null,
  min_order_amount integer not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- 6. Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  invoice text not null unique,
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  delivery_zone text not null check (delivery_zone in ('inside_dhaka', 'outside_dhaka')),
  note text default '',
  items jsonb not null,
  subtotal integer not null,
  discount_amount integer not null default 0,
  coupon_code text,
  delivery_charge integer not null default 0,
  total_amount integer not null,
  order_status text not null default 'pending',
  steadfast_consignment_id text,
  steadfast_tracking_code text,
  steadfast_status text,
  steadfast_sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.store_settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.reviews enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;

-- Explicit Schema & Table Grants (Required on newer Supabase projects)
grant usage on schema public to anon, authenticated;

grant select on public.categories to anon;
grant select on public.products to anon;
grant select, insert on public.reviews to anon;
grant select on public.coupons to anon;
grant insert on public.orders to anon;

grant select, insert, update, delete on public.store_settings to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert, update, delete on public.coupons to authenticated;
grant select, insert, update, delete on public.orders to authenticated;

-- Seed default settings row & starter coupons safely
insert into public.store_settings (id) values (1) on conflict (id) do nothing;

insert into public.coupons (code, discount_type, discount_value, min_order_amount, active)
values
  ('INAYA10', 'percentage', 10, 1200, true),
  ('WINTER200', 'fixed', 200, 2000, true)
on conflict (code) do nothing;

-- Public Storefront Policies (Idempotent)
drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories" on public.categories for select to anon, authenticated using (true);

drop policy if exists "Public read products" on public.products;
create policy "Public read products" on public.products for select to anon, authenticated using (true);

drop policy if exists "Public read reviews" on public.reviews;
create policy "Public read reviews" on public.reviews for select to anon, authenticated using (true);

drop policy if exists "Public insert reviews" on public.reviews;
create policy "Public insert reviews" on public.reviews for insert to anon, authenticated with check (true);

drop policy if exists "Public read active coupons" on public.coupons;
create policy "Public read active coupons" on public.coupons for select to anon, authenticated using (active = true);

drop policy if exists "Public create orders" on public.orders;
create policy "Public create orders" on public.orders for insert to anon, authenticated with check (true);

-- Authenticated Admin Policies (Supabase Auth)
drop policy if exists "Authenticated admin full access categories" on public.categories;
create policy "Authenticated admin full access categories" on public.categories for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated admin full access products" on public.products;
create policy "Authenticated admin full access products" on public.products for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated admin full access reviews" on public.reviews;
create policy "Authenticated admin full access reviews" on public.reviews for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated admin full access coupons" on public.coupons;
create policy "Authenticated admin full access coupons" on public.coupons for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated admin full access orders" on public.orders;
create policy "Authenticated admin full access orders" on public.orders for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated admin full access settings" on public.store_settings;
create policy "Authenticated admin full access settings" on public.store_settings for all to authenticated using (true) with check (true);

-- Safe Public Storefront RPC (never exposes Steadfast/Meta/Cloudinary secret keys)
create or replace function public.get_public_store_settings()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select to_jsonb(t)
  from (
    select
      store_name,
      topbar_enabled,
      topbar_text,
      delivery_enabled,
      delivery_inside_dhaka,
      delivery_outside_dhaka,
      free_delivery_threshold,
      social_links,
      meta_pixel_id
    from public.store_settings
    where id = 1
    limit 1
  ) t;
$$;

grant execute on function public.get_public_store_settings() to anon, authenticated;

-- Safe Public Order Tracking RPC (lookup by invoice or phone tail without exposing street address)
create or replace function public.track_order_public(lookup_query text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select to_jsonb(t)
  from (
    select
      invoice,
      customer_name,
      delivery_zone,
      items,
      total_amount,
      order_status,
      steadfast_consignment_id,
      steadfast_tracking_code,
      steadfast_status,
      created_at
    from public.orders
    where upper(invoice) = upper(trim(lookup_query))
       or right(regexp_replace(customer_phone, '[^0-9]', '', 'g'), 8) = right(regexp_replace(lookup_query, '[^0-9]', '', 'g'), 8)
    order by created_at desc
    limit 1
  ) t;
$$;

grant execute on function public.track_order_public(text) to anon, authenticated;
