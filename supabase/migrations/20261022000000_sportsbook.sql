-- Solid Sportsbook — bragging-rights layer.
-- Play money only: balances are bragging rights, never real funds.
-- Apply in the Supabase SQL editor (or via migrations) on a fresh project.

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  balance numeric not null default 1000,
  created_at timestamptz not null default now()
);

-- ---------- bets ----------
create table public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('single', 'parlay')),
  -- array of {gameId, league, matchup, market, pickLabel, line, oddsAmerican}
  legs jsonb not null,
  stake numeric not null check (stake > 0),
  combined_odds_american int not null,
  potential_payout numeric not null,
  status text not null default 'pending' check (status in ('pending', 'won', 'lost', 'push')),
  placed_at timestamptz not null default now(),
  settled_at timestamptz
);

create index bets_user_id_idx on public.bets (user_id, placed_at desc);

-- ---------- profile on signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------- place_bet ----------
-- The only way a client can create a bet: debits the balance and inserts
-- the bet atomically, so a balance can never go negative or be bet twice.
create or replace function public.place_bet(
  p_kind text,
  p_legs jsonb,
  p_stake numeric,
  p_combined_odds int,
  p_potential_payout numeric
)
returns public.bets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_balance numeric;
  v_bet public.bets;
begin
  if v_user is null then
    raise exception 'You must be signed in to place a bet';
  end if;
  if p_kind not in ('single', 'parlay') then
    raise exception 'Invalid bet kind';
  end if;
  if p_stake is null or p_stake <= 0 then
    raise exception 'Stake must be more than zero';
  end if;
  if p_legs is null or jsonb_array_length(p_legs) = 0 then
    raise exception 'A bet needs at least one pick';
  end if;

  select balance into v_balance
  from public.profiles
  where id = v_user
  for update;

  if v_balance is null then
    raise exception 'Profile not found';
  end if;
  if v_balance < p_stake then
    raise exception 'Insufficient balance';
  end if;

  update public.profiles
  set balance = balance - p_stake
  where id = v_user;

  insert into public.bets (user_id, kind, legs, stake, combined_odds_american, potential_payout)
  values (v_user, p_kind, p_legs, p_stake, p_combined_odds, p_potential_payout)
  returning * into v_bet;

  return v_bet;
end;
$$;

revoke execute on function public.place_bet(text, jsonb, numeric, int, numeric) from public, anon;
grant execute on function public.place_bet(text, jsonb, numeric, int, numeric) to authenticated;

-- ---------- leaderboard ----------
-- Aggregates settled records per player. Runs with the view owner's rights,
-- which is what lets every signed-in player see the full standings.
create or replace view public.leaderboard_standings as
select
  p.id,
  p.display_name,
  p.balance,
  (count(b.id) filter (where b.status = 'won'))::int as wins,
  (count(b.id) filter (where b.status = 'lost'))::int as losses,
  (count(b.id) filter (where b.status = 'push'))::int as pushes,
  coalesce(sum(b.stake), 0) as total_wagered
from public.profiles p
left join public.bets b on b.user_id = p.id
group by p.id, p.display_name, p.balance
order by p.balance desc;

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.bets enable row level security;

-- Profiles: everyone signed in can read them (that's the leaderboard);
-- you can only touch your own row.
create policy "Profiles readable by signed-in users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Bets: everyone signed in can read them — seeing your friends' picks is
-- the whole point. No direct insert/update/delete for clients: bets are
-- created only through place_bet() and settled only from the SQL editor.
create policy "Bets readable by signed-in users"
  on public.bets for select
  to authenticated
  using (true);

-- ---------- grants ----------
-- Column discipline: even with the update policy above, clients can only
-- ever write display_name — balance moves only inside place_bet() (security
-- definer) or from the SQL editor when settling.
revoke insert, update, delete on public.profiles from anon, authenticated;
revoke insert, update, delete on public.bets from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select on public.bets to authenticated;
grant select on public.leaderboard_standings to authenticated;
