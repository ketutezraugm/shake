-- Profiles, public Q&A and per-deal chat. Same rule as 0001: only the relayer (service role) touches tables.

create table profiles (
  account_id       text primary key,
  handle           text not null unique check (handle ~ '^[a-z0-9](-?[a-z0-9]){1,31}$'),
  display_name     text not null default '' check (octet_length(display_name) <= 60),
  avatar_url       text,
  bio              text not null default '' check (octet_length(bio) <= 300),
  city             text not null default '' check (octet_length(city) <= 60),
  auth             text not null check (auth in ('email', 'wallet')),
  supabase_user_id uuid unique,
  created_at       timestamptz not null default now()
);

create table questions (
  id            bigint generated always as identity primary key,
  listing_id    uuid not null references listings (id) on delete cascade,
  asker_account text not null,
  question      text not null check (octet_length(question) between 1 and 500),
  answer        text check (octet_length(answer) between 1 and 1000),
  answered_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index questions_listing_idx on questions (listing_id, answered_at);

create table messages (
  id             bigint generated always as identity primary key,
  deal_id        bigint not null,
  sender_account text not null,
  body           text not null check (octet_length(body) between 1 and 1000),
  created_at     timestamptz not null default now()
);

create index messages_deal_idx on messages (deal_id, id);

-- The deal that holds the reservation, so a second matching deal never reserves the listing again.
alter table listings add column reserved_deal_id bigint;
alter table listings drop constraint listings_status_check;
alter table listings add constraint listings_status_check check (status in ('open', 'reserved', 'sold', 'closed'));

alter table profiles enable row level security;
alter table questions enable row level security;
alter table messages enable row level security;

revoke all on profiles, questions, messages from anon, authenticated;

-- A view created with `select l.*` froze its column list, so rebuild it to include reserved_deal_id.
drop view listing_cards;
create view listing_cards with (security_invoker = true) as
select l.*,
       (select count(*) from slots s where s.listing_id = l.id and s.buyer_account is null)::int as free_slots
from listings l;
revoke all on listing_cards from anon, authenticated;
