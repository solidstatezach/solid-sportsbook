# Solid Sportsbook

A front-end demo sportsbook — a bookmaker-style board with sample lines, a working
bet slip, and real parlay math. **No real wagering, no real money.** All odds are
static demo data in `src/lib/book.ts`.

## What's in it

- **The board** — 10 sample games across NFL, NBA, MLB, and NHL, each with
  Spread / Moneyline / Total markets in American odds format.
- **League filter** — sticky rail to view one league or the whole board.
- **Bet slip** — tap odds to add picks (one pick per market per game; switching
  sides replaces it). Singles and parlays price live: combined odds, to-win, and
  total payout update as you change the stake. Quick-stake chips included.
- **Demo bets** — "Place demo bet" records the wager in a My Demo Bets list and
  clears the slip.
- **Mobile** — the slip collapses into a sticky bottom bar showing pick count,
  combined odds, and payout; tap to expand the full slip.

## Run it

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # production build
```

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4

## Layout

- `src/lib/book.ts` — types, demo lines, odds math (American ↔ decimal, parlay
  combination, payouts)
- `src/components/Sportsbook.tsx` — client shell: state, header, league rail,
  mobile slip bar
- `src/components/GameCard.tsx` — one game's market grid
- `src/components/OddsButton.tsx` — a single odds cell with selected state
- `src/components/BetSlip.tsx` — slip, stake entry, payout math, placed bets
