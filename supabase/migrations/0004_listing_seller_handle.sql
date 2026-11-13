-- The seller's shop handle is chosen at sign-up and has nothing to do with the account id, so listings carry it.
drop view listing_cards;
create view listing_cards with (security_invoker = true) as
select l.*,
       (select count(*) from slots s where s.listing_id = l.id and s.buyer_account is null)::int as free_slots,
       (select p.handle from profiles p where p.account_id = l.seller_account) as seller_handle
from listings l;
revoke all on listing_cards from anon, authenticated;
