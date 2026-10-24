# Solid Sportsbook

A bookmaker-style sportsbook — a betting board with full lines, a working
bet slip, and real parlay math. All odds are static sample data in
`src/lib/book.ts`.

## What's in it

- **The board** — 10 sample games across NFL, NBA, MLB, and NHL, each with
  Spread / Moneyline / Total markets in American odds format.
- **League filter** — sticky rail to view one league or the whole board.
- **Bet slip** — tap odds to add picks (one pick per market per game; switching
  sides replaces it). Singles and parlays price live: combined odds, to-win, and
  total payout update as you change the stake. Quick-stake chips included.
- **Placed bets** — "Place bet" records the wager in a My Bets list and
  clears the slip.
- **Mobile** — the slip collapses into a sticky bottom bar showing pick count,
  combined odds, and payout; tap to expand the full slip.
- **Accounts & leaderboard (optional)** — connect a Supabase project and the
  book gains sign-ups, persistent balances, saved bets everyone can see, and
  a `/leaderboard` page ranked by bankroll. Without it, everything above
  works in local mode with nothing saved. See below.

## Going live with Supabase

The book is a bragging-rights game for you and your friends — play money
only, no real funds anywhere. Setup takes about five minutes:

1. **Create a project** at [supabase.com](https://supabase.com) (free tier
   is plenty).
2. **Run the migration** — open the project's SQL editor, paste in
   `supabase/migrations/20261022000000_sportsbook.sql`, and run it. That
   creates `profiles`, `bets`, the `place_bet()` function, row-level
   security, and the `leaderboard_standings` view.
3. **Set two env vars** in Vercel (Project → Settings → Environment
   Variables), from the Supabase project's Settings → API page:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Redeploy.** Sign-ups open automatically once the env vars land.
   - Tip: in Supabase Auth settings, turn **off** "Confirm email" so
     friends can sign up and bet immediately, no inbox round-trip.

How it plays:

- Every account starts with **$1,000 in play money**. Placing a bet debits
  the balance through `place_bet()` — the balance can't go negative or be
  edited from the client; only a display name is client-writable.
- All signed-in players can see each other's bets and the leaderboard.
  That's the point.
- **Settling happens on the `/admin` page** — tap Won / Lost / Push on each
  pending bet once the games finish (see "Running the book" below). An
  automatic scores feed is the planned next step.

## Running the book (admin)

Once accounts are live, one account runs the book from the `/admin` page —
no more SQL for day-to-day settling.

1. **Run the admin migration** — after the main migration above, paste
   `supabase/migrations/20261023000000_admin.sql` into the SQL editor and
   run it. It adds an `is_admin` flag to profiles plus two locked-down
   functions: `settle_bet()` and `admin_adjust_balance()`. Both check the
   caller's `is_admin` inside the function, so only an admin can ever call
   them successfully.
2. **Make yourself the admin** — find your user id in Supabase Dashboard →
   Authentication → Users, then run one line in the SQL editor:
   `update public.profiles set is_admin = true where id = '<your user id>';`
   Nobody can set this flag from the app (clients can only edit their own
   display name), so it can't be grabbed by a player. An **Admin** link
   appears in the header and on the leaderboard once you're flagged.
3. **What `/admin` does:**
   - **Pending bets** — every unsettled bet across all players, with the
     picks, stake, odds, and payout. **Won** credits the full payout (stake
     + winnings — the stake was already taken at placement), **Push**
     refunds the stake, **Lost** credits nothing. Only pending bets can be
     settled, and settling is final.
   - **Players** — balances and W–L records, with a top-up box per player:
     enter an amount and hit **Add** to credit play money (a rebuy when a
     friend busts out). Negative amounts deduct, and a balance can never be
     pushed below zero.

## Run it

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # production build
```

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Supabase (optional — auth, Postgres, RLS) for accounts and the leaderboard

## Layout

- `src/lib/book.ts` — types, lines, odds math (American ↔ decimal, parlay
  combination, payouts)
- `src/lib/bets.ts` — account-backed bet shapes: DB rows, leg serialization,
  leaderboard standings
- `src/lib/supabase/` — Supabase clients (browser/server/proxy) + the
  `isSupabaseEnabled` switch that keeps local mode working with no env vars
- `supabase/migrations/` — schema, `place_bet()`, RLS, leaderboard view,
  plus the admin migration (`settle_bet()`, balance adjustments, `is_admin`)
- `src/components/Sportsbook.tsx` — client shell: state, header, league rail,
  mobile slip bar
- `src/components/GameCard.tsx` — one game's market grid
- `src/components/OddsButton.tsx` — a single odds cell with selected state
- `src/components/BetSlip.tsx` — slip, stake entry, payout math, placed bets
- `src/app/login`, `src/app/signup`, `src/app/leaderboard` — account pages
  and the standings table
- `src/app/admin` — the book-runner's page: settle pending bets, top up
  players (admin accounts only)
