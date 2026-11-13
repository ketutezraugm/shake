-- Proof of each money step, written only by the relayer after it has checked the transaction on chain.
create table receipts (
  deal_id        bigint not null references slots (deal_id),
  kind           text not null check (kind in ('deposit', 'release')),
  tx_hash        text not null unique,
  signer_account text not null,
  amount_yocto   numeric not null,
  recorded_at    timestamptz not null default now(),
  primary key (deal_id, kind)
);

alter table receipts enable row level security;
revoke all on receipts from anon, authenticated;
