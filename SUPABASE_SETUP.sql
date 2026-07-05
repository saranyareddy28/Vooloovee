-- Run this once in Supabase SQL Editor for Vooloovee
create table if not exists public.products (
  id text primary key,
  brand text not null,
  name text not null,
  category text not null,
  price numeric not null default 0,
  discount numeric not null default 0,
  sizes jsonb not null default '[]'::jsonb,
  stock_by_size jsonb not null default '{}'::jsonb,
  description text,
  image_url text,
  created_at timestamptz default now()
);

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

alter table public.products enable row level security;

drop policy if exists "Products are public readable" on public.products;
create policy "Products are public readable" on public.products
for select using (true);

drop policy if exists "Products can be inserted from app" on public.products;
create policy "Products can be inserted from app" on public.products
for insert with check (true);

drop policy if exists "Products can be updated from app" on public.products;
create policy "Products can be updated from app" on public.products
for update using (true) with check (true);

drop policy if exists "Products can be deleted from app" on public.products;
create policy "Products can be deleted from app" on public.products
for delete using (true);

drop policy if exists "Product images are public readable" on storage.objects;
create policy "Product images are public readable" on storage.objects
for select using (bucket_id = 'product-images');

drop policy if exists "Product images can be uploaded from app" on storage.objects;
create policy "Product images can be uploaded from app" on storage.objects
for insert with check (bucket_id = 'product-images');
