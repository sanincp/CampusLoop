-- =====================================================================
-- CampusLoop – Supabase schema
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query
-- =====================================================================

-- ---------- Tables ----------------------------------------------------

-- Public profile (safe to show to anyone browsing items)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  course_year text,                       -- e.g. "3rd Year, BCA"
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Private details (only the owner can read these)
create table if not exists public.profile_private (
  id         uuid primary key references public.profiles(id) on delete cascade,
  student_id text,
  phone      text
);

create table if not exists public.items (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  title         text not null check (char_length(title) between 3 and 120),
  category      text not null check (category in
                  ('Books','Electronics','Furniture','Stationery','Lab Equipment','Others')),
  description   text not null check (char_length(description) <= 500),
  price         numeric(10,2) check (price is null or price >= 0),
  negotiable    boolean not null default false,
  condition     text not null check (condition in ('New','Like New','Good','Fair','Used')),
  location      text not null,
  -- which request types this item accepts: sell → "Buy", exchange, lend
  available_for text[] not null default '{sell}'
                  check (cardinality(available_for) > 0
                         and available_for <@ array['sell','exchange','lend']::text[]),
  exchange_for  text,                     -- preferred item in exchange (optional)
  images        text[] not null default '{}' check (cardinality(images) <= 5),
  status        text not null default 'available'
                  check (status in ('available','sold','exchanged','lent')),
  views         integer not null default 0,
  created_at    timestamptz not null default now(),
  constraint price_required_for_sale
    check (not ('sell' = any(available_for)) or price is not null)
);
create index if not exists items_created_idx  on public.items (created_at desc);
create index if not exists items_owner_idx    on public.items (owner_id);
create index if not exists items_category_idx on public.items (category);

create table if not exists public.requests (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references public.items(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  type         text not null check (type in ('buy','exchange','lend')),
  message      text check (char_length(message) <= 500),
  offered_item text,                      -- exchange: what the requester offers
  start_date   date,                      -- lend: from
  end_date     date,                      -- lend: to
  status       text not null default 'pending'
                 check (status in ('pending','accepted','rejected','cancelled')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  check (start_date is null or end_date is null or end_date >= start_date)
);
create index if not exists requests_owner_idx     on public.requests (owner_id, created_at desc);
create index if not exists requests_requester_idx on public.requests (requester_id, created_at desc);
-- one open request per student, per item, per type
create unique index if not exists requests_one_pending
  on public.requests (item_id, requester_id, type) where status = 'pending';

-- ---------- Auto-create profile on sign up ----------------------------
-- The signup form passes full_name, course_year, student_id and phone as
-- user metadata; this trigger copies them into the profile tables.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, course_year, avatar_url)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''),
             nullif(new.raw_user_meta_data->>'name',''),      -- Google sign-in
             split_part(new.email,'@',1)),
    nullif(new.raw_user_meta_data->>'course_year',''),
    nullif(new.raw_user_meta_data->>'avatar_url','')          -- Google sign-in
  );
  insert into public.profile_private (id, student_id, phone)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'student_id',''),
    nullif(new.raw_user_meta_data->>'phone','')
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Request validation ----------------------------------------
-- The client only sends item_id/type/message etc. The database decides who
-- the owner is and rejects invalid requests (own item, unavailable, etc.).

create or replace function public.prepare_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  it   public.items;
  flag text;
begin
  select * into it from public.items where id = new.item_id;
  if not found then raise exception 'Item not found'; end if;
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  if it.owner_id = auth.uid() then raise exception 'You cannot request your own item'; end if;
  if it.status <> 'available' then raise exception 'This item is no longer available'; end if;

  flag := case new.type when 'buy' then 'sell' else new.type end;
  if not (flag = any(it.available_for)) then
    raise exception 'This item is not open for % requests', new.type;
  end if;

  new.owner_id     := it.owner_id;
  new.requester_id := auth.uid();
  new.status       := 'pending';
  new.responded_at := null;
  return new;
end $$;

drop trigger if exists requests_prepare on public.requests;
create trigger requests_prepare
  before insert on public.requests
  for each row execute function public.prepare_request();

-- ---------- RPC: accept / reject a request ----------------------------
create or replace function public.respond_to_request(p_request uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare r public.requests;
begin
  select * into r from public.requests where id = p_request for update;
  if not found or r.owner_id is distinct from auth.uid() then
    raise exception 'Not allowed';
  end if;
  if r.status <> 'pending' then raise exception 'This request was already handled'; end if;

  if p_accept then
    if (select status from public.items where id = r.item_id) <> 'available' then
      raise exception 'This item is no longer available';
    end if;
    update public.requests set status = 'accepted', responded_at = now() where id = r.id;
    update public.items
       set status = case r.type when 'buy' then 'sold'
                                when 'exchange' then 'exchanged'
                                else 'lent' end
     where id = r.item_id;
    -- the item is taken, so close every other open request for it
    update public.requests set status = 'rejected', responded_at = now()
     where item_id = r.item_id and status = 'pending' and id <> r.id;
  else
    update public.requests set status = 'rejected', responded_at = now() where id = r.id;
  end if;
end $$;

-- ---------- RPC: contact details after a request is accepted ----------
create or replace function public.get_request_contact(p_request uuid)
returns table (full_name text, phone text, email text)
language sql security definer set search_path = public as $$
  select p.full_name, pp.phone, u.email::text
  from public.requests r
  join public.profiles p
    on p.id = case when auth.uid() = r.owner_id then r.requester_id else r.owner_id end
  left join public.profile_private pp on pp.id = p.id
  join auth.users u on u.id = p.id
  where r.id = p_request
    and r.status = 'accepted'
    and auth.uid() in (r.owner_id, r.requester_id);
$$;

-- ---------- RPC: count a view (not the owner's own) -------------------
create or replace function public.increment_views(p_item uuid)
returns void language sql security definer set search_path = public as $$
  update public.items set views = views + 1
  where id = p_item and owner_id is distinct from auth.uid();
$$;

-- ---------- Row Level Security ----------------------------------------
alter table public.profiles        enable row level security;
alter table public.profile_private enable row level security;
alter table public.items           enable row level security;
alter table public.requests        enable row level security;

-- profiles: anyone can read (needed for seller info), only you can edit yours
drop policy if exists "profiles readable"   on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles readable"   on public.profiles for select using (true);
create policy "profiles update own" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- private details: owner only
drop policy if exists "private select own" on public.profile_private;
drop policy if exists "private update own" on public.profile_private;
create policy "private select own" on public.profile_private for select using (id = auth.uid());
create policy "private update own" on public.profile_private for update
  using (id = auth.uid()) with check (id = auth.uid());

-- items: public to read, owner-only to write
drop policy if exists "items readable"     on public.items;
drop policy if exists "items insert own"   on public.items;
drop policy if exists "items update own"   on public.items;
drop policy if exists "items delete own"   on public.items;
create policy "items readable"   on public.items for select using (true);
create policy "items insert own" on public.items for insert to authenticated
  with check (owner_id = auth.uid());
create policy "items update own" on public.items for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "items delete own" on public.items for delete to authenticated
  using (owner_id = auth.uid());

-- requests: visible to the two people involved. Owners respond through
-- respond_to_request(); requesters may only cancel their own pending request.
drop policy if exists "requests read involved"  on public.requests;
drop policy if exists "requests insert own"     on public.requests;
drop policy if exists "requests cancel own"     on public.requests;
create policy "requests read involved" on public.requests for select to authenticated
  using (requester_id = auth.uid() or owner_id = auth.uid());
create policy "requests insert own" on public.requests for insert to authenticated
  with check (requester_id = auth.uid());
create policy "requests cancel own" on public.requests for update to authenticated
  using (requester_id = auth.uid() and status = 'pending')
  with check (requester_id = auth.uid() and status = 'cancelled');

-- ---------- Storage (item photos + avatars) ---------------------------
insert into storage.buckets (id, name, public)
values ('campusloop', 'campusloop', true)
on conflict (id) do nothing;

drop policy if exists "campusloop public read" on storage.objects;
drop policy if exists "campusloop upload own"  on storage.objects;
drop policy if exists "campusloop delete own"  on storage.objects;
create policy "campusloop public read" on storage.objects for select
  using (bucket_id = 'campusloop');
create policy "campusloop upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'campusloop' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "campusloop delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'campusloop' and (storage.foldername(name))[1] = auth.uid()::text);
