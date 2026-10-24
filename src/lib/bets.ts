// Account-backed bets: DB row shapes, leg (de)serialization, standings.
// Local mode never touches this file's converters at runtime except types.

import type { BetStatus, League, PlacedBet, Selection } from "./book";

/** One leg as stored in bets.legs (jsonb). */
export interface BetLeg {
  gameId: string;
  league: League;
  matchup: string;
  market: string;
  pickLabel: string;
  line: string | null;
  oddsAmerican: number;
}

/** A row from public.bets. Numeric columns come back as strings from PostgREST. */
export interface DbBet {
  id: string;
  user_id: string;
  kind: "single" | "parlay";
  legs: BetLeg[];
  stake: number | string;
  combined_odds_american: number;
  potential_payout: number | string;
  status: BetStatus;
  placed_at: string;
  settled_at: string | null;
}

/** A row from public.profiles. is_admin arrives with the admin migration. */
export interface Profile {
  id: string;
  display_name: string | null;
  balance: number | string;
  is_admin?: boolean;
}

/** A row from the leaderboard_standings view. */
export interface Standing {
  id: string;
  display_name: string | null;
  balance: number | string;
  wins: number;
  losses: number;
  pushes: number;
  total_wagered: number | string;
}

export function serializeLeg(sel: Selection): BetLeg {
  return {
    gameId: sel.gameId,
    league: sel.league,
    matchup: sel.matchup,
    market: sel.market,
    pickLabel: sel.pick,
    line: sel.line ?? null,
    oddsAmerican: sel.odds,
  };
}

export function dbBetToPlacedBet(bet: DbBet): PlacedBet {
  const stake = Number(bet.stake);
  const payout = Number(bet.potential_payout);
  return {
    id: bet.id,
    legs: (bet.legs ?? []).map((leg, i) => ({
      id: `${bet.id}:${i}`,
      gameId: leg.gameId,
      league: leg.league,
      matchup: leg.matchup,
      market: leg.market,
      pick: leg.pickLabel,
      label: leg.pickLabel,
      line: leg.line ?? undefined,
      odds: leg.oddsAmerican,
    })),
    stake,
    combinedOdds: bet.combined_odds_american,
    toWin: payout - stake,
    payout,
    status: bet.status,
  };
}
