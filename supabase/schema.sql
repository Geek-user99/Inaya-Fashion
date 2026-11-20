-- ==============================================================================
-- INAYA FASHION — SUPABASE POSTGRESQL SCHEMA & ROW LEVEL SECURITY
-- Project ID: mtngwbrcywmmxfwrumxb
-- Run this script once in Supabase Dashboard -> SQL Editor
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

-- Public Read Policies (Storefront)
create policy "Public read categories" on public.categories for select using (true);
create policy "Public read products" on public.products for select using (true);
create policy "Public read reviews" on public.reviews for select using (true);

-- Note: store_settings & orders & coupons contain sensitive business data (API keys, customer PII).
-- All reads/writes for settings, coupons, and orders are routed strictly through our Express server
-- using SUPABASE_SERVICE_ROLE_KEY so secrets and customer PII never leak via browser anon key!
create policy "Authenticated admin full access categories" on public.categories for all to authenticated using (true) with check (true);
create policy "Authenticated admin full access products" on public.products for all to authenticated using (true) with check (true);
create policy "Authenticated admin full access reviews" on public.reviews for all to authenticated using (true) with check (true);
create policy "Authenticated admin full access coupons" on public.coupons for all to authenticated using (true) with check (true);
create policy "Authenticated admin full access orders" on public.orders for all to authenticated using (true) with check (true);
create policy "Authenticated admin full access settings" on public.store_settings for all to authenticated using (true) with check (true);
