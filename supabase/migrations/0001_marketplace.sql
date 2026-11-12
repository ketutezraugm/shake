-- Marketplace listings. Only the relayer (service role) touches these tables:
-- RLS is on with no policies, so the public anon key can read and write nothing.

create table listings (
  id             uuid primary key default gen_random_uuid(),
  seller_account text not null,
  title          text not null check (octet_length(title) between 1 and 100),
  description    text not null check (octet_length(description) <= 1000),
  category       text not null check (category in ('electronics', 'fashion', 'home', 'vehicles', 'hobbies', 'other')),
  photo_paths    text[] not null default '{}' check (cardinality(photo_paths) <= 4),
  max_rounds     smallint not null check (max_rounds between 1 and 3),
  status         text not null default 'open' check (status in ('open', 'sold', 'closed')),
  created_at     timestamptz not null default now()
);

create index listings_browse_idx on listings (status, created_at desc);
create index listings_seller_idx on listings (seller_account);

-- One slot is one pre-created on-chain deal that a single buyer can claim.
create table slots (
  id            bigint generated always as identity primary key,
  listing_id    uuid not null references listings (id) on delete cascade,
  deal_id       bigint not null unique,
  link_token    text not null,
  buyer_account text,
  claimed_at    timestamptz,
  unique (listing_id, buyer_account)
);

create index slots_buyer_idx on slots (buyer_account);

alter table listings enable row level security;
alter table slots enable row level security;

create view listing_cards with (security_invoker = true) as
select l.*,
       (select count(*) from slots s where s.listing_id = l.id and s.buyer_account is null)::int as free_slots
from listings l;

-- Returns the buyer's existing slot or locks a free one; no row means the listing is full.
create function claim_slot(p_listing uuid, p_buyer text)
returns table (deal_id bigint, link_token text)
language plpgsql set search_path = public as $$
declare
  s slots%rowtype;
begin
  select * into s from slots where listing_id = p_listing and buyer_account = p_buyer;
  if found then
    return query select s.deal_id, s.link_token;
    return;
  end if;

  select * into s from slots
   where listing_id = p_listing and buyer_account is null
   order by id limit 1
   for update skip locked;
  if not found then
    return;
  end if;

  update slots set buyer_account = p_buyer, claimed_at = now() where id = s.id;
  return query select s.deal_id, s.link_token;
exception when unique_violation then
  -- The same buyer claimed twice at once; hand back the slot the other call won.
  select * into s from slots where listing_id = p_listing and buyer_account = p_buyer;
  return query select s.deal_id, s.link_token;
end;
$$;

revoke all on function claim_slot(uuid, text) from public, anon, authenticated;
revoke all on listing_cards from anon, authenticated;
revoke all on listings, slots from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
