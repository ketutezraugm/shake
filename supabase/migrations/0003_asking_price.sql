-- Every listing shows a public asking price in whole Rupiah; the seller's real minimum stays sealed on chain.
-- The temporary default only fills rows that existed before this migration; new listings must send a price.
alter table listings add column asking_price bigint not null default 1 check (asking_price > 0);
alter table listings alter column asking_price drop default;

-- A view created with `select l.*` froze its column list, so rebuild it to include asking_price.
drop view listing_cards;
create view listing_cards with (security_invoker = true) as
select l.*,
       (select count(*) from slots s where s.listing_id = l.id and s.buyer_account is null)::int as free_slots
from listings l;
revoke all on listing_cards from anon, authenticated;
