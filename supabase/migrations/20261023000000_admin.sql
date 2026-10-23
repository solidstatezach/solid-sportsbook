-- Solid Sportsbook — admin layer: settle bets and top up players from the
-- /admin page instead of hand-written SQL.
-- Play money only: balances are bragging rights, never real funds.
-- Apply AFTER 20261022000000_sportsbook.sql (SQL editor or migrations).

-- ---------- admin flag ----------
alter table public.profiles
  add column is_admin boolean not null default false;

-- Make yourself the admin (one-time, in the SQL editor):
--   1. Find your user id in Supabase Dashboard → Authentication → Users.
--   2. Run:
--        update public.profiles set is_admin = true where id = '<your auth user id>';
-- Nobody can flip this flag from the app: the profiles grants only let
-- clients update display_name, so is_admin changes only via the SQL editor.

-- ---------- settle_bet ----------
-- The only way a client can settle a bet. The admin check lives inside the
-- function (security definer), so granting execute to every signed-in user
-- is safe — a non-admin caller just gets an exception.
-- Credits: 'won' pays out potential_payout (stake + winnings; the stake was
-- already debited at placement), 'push' refunds the stake, 'lost' pays 0.
create or replace function public.settle_bet(p_bet_id uuid, p_result text)
returns public.bets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_bet public.bets;
begin
  if v_user is null then
    raise exception 'You must be signed in to settle a bet';
  end if;
  if not exists (
    select 1 from public.profiles where id = v_user and is_admin
  ) then
    raise exception 'Only an admin can settle bets';
  end if;
  if p_result not in ('won', 'lost', 'push') then
    raise exception 'Result must be won, lost, or push';
  end if;

  select * into v_bet
  from public.bets
  where id = p_bet_id
  for update;

  if not found then
    raise exception 'Bet not found';
  end if;
  if v_bet.status <> 'pending' then
    raise exception 'Bet is already settled (%)', v_bet.status;
  end if;

  update public.bets
  set status = p_result, settled_at = now()
  where id = p_bet_id
  returning * into v_bet;

  if p_result = 'won' then
    update public.profiles
    set balance = balance + v_bet.potential_payout
    where id = v_bet.user_id;
  elsif p_result = 'push' then
    update public.profiles
    set balance = balance + v_bet.stake
    where id = v_bet.user_id;
  end if;

  return v_bet;
end;
$$;

revoke execute on function public.settle_bet(uuid, text) from public, anon;
grant execute on function public.settle_bet(uuid, text) to authenticated;

-- ---------- admin_adjust_balance ----------
-- Rebuys and top-ups: adds p_amount to a player's balance (negative amounts
-- deduct, e.g. correcting a mistake). Same in-function admin gate as
-- settle_bet. A balance can never be driven below zero — the call raises
-- instead of clamping, so a typo can't silently eat someone's bankroll.
create or replace function public.admin_adjust_balance(p_user_id uuid, p_amount numeric)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_user is null then
    raise exception 'You must be signed in to adjust a balance';
  end if;
  if not exists (
    select 1 from public.profiles where id = v_user and is_admin
  ) then
    raise exception 'Only an admin can adjust balances';
  end if;
  if p_amount is null or p_amount = 0 then
    raise exception 'Amount must be non-zero';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Player not found';
  end if;
  if v_profile.balance + p_amount < 0 then
    raise exception 'That would take the balance below zero (balance is %, adjustment is %)',
      v_profile.balance, p_amount;
  end if;

  update public.profiles
  set balance = balance + p_amount
  where id = p_user_id
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke execute on function public.admin_adjust_balance(uuid, numeric) from public, anon;
grant execute on function public.admin_adjust_balance(uuid, numeric) to authenticated;
