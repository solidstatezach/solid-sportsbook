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
- **Settling is manual for now**: after games finish, mark bets in the SQL
  editor (`update bets set status = 'won', settled_at = now() where ...`)
  and credit winners (`update profiles set balance = balance + <potential
  payout> ...`; a `push` refunds the stake). An automatic scores feed is
  the planned next step.

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
- `supabase/migrations/` — schema, `place_bet()`, RLS, leaderboard view
- `src/components/Sportsbook.tsx` — client shell: state, header, league rail,
  mobile slip bar
- `src/components/GameCard.tsx` — one game's market grid
- `src/components/OddsButton.tsx` — a single odds cell with selected state
- `src/components/BetSlip.tsx` — slip, stake entry, payout math, placed bets
- `src/app/login`, `src/app/signup`, `src/app/leaderboard` — account pages
  and the standings table
