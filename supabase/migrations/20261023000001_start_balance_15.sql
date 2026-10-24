-- Start new players at 15 instead of 1000.
-- New signups start at 15 from now on; existing balances are untouched
-- by this migration (a manual reset is a separate one-liner in the SQL editor).

alter table public.profiles alter column balance set default 15;
