// Solid Sportsbook — data model, lines, and odds math.
// All lines are static sample data for the front-end.

export type League = "NFL" | "NBA" | "MLB" | "NHL";

export type MarketKey = "spread" | "moneyline" | "total";

export interface MarketOption {
  /** e.g. "Buffalo Bills", "Over" */
  label: string;
  /** e.g. "+3.5", "O 47.5" — points/total line, when the market has one */
  line?: string;
  /** American odds, e.g. -110 or +145 */
  odds: number;
}

export interface Market {
  key: MarketKey;
  label: string;
  options: [MarketOption, MarketOption];
}

export interface Game {
  id: string;
  league: League;
  startsAt: string;
  away: string;
  home: string;
  markets: [Market, Market, Market];
}

/** One picked outcome on the bet slip. */
export interface Selection {
  id: string; // gameId:marketKey:optionIndex
  gameId: string;
  league: League;
  matchup: string;
  market: string;
  pick: string; // "Buffalo Bills +3.5"
  /** the raw option label, e.g. "Buffalo Bills" or "Over" */
  label: string;
  /** points/total line when the market has one, e.g. "+3.5" or "47.5" */
  line?: string;
  odds: number; // American
}

export type BetStatus = "pending" | "won" | "lost" | "push";

export interface PlacedBet {
  id: string;
  legs: Selection[];
  stake: number;
  combinedOdds: number; // American
  toWin: number;
  payout: number;
  /** present for account-backed bets; local-mode bets stay unset (pending by nature) */
  status?: BetStatus;
}

// ---------- odds math ----------

export function americanToDecimal(odds: number): number {
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
}

export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

export function formatAmerican(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

export function impliedProbability(odds: number): number {
  const d = americanToDecimal(odds);
  return (1 / d) * 100;
}

export function combineOdds(legs: Selection[]): number {
  if (legs.length === 0) return 0;
  const decimal = legs.reduce((acc, leg) => acc * americanToDecimal(leg.odds), 1);
  return legs.length === 1 ? legs[0].odds : decimalToAmerican(decimal);
}

export function payoutFor(stake: number, americanOdds: number): { toWin: number; payout: number } {
  const payout = stake * americanToDecimal(americanOdds);
  return { toWin: payout - stake, payout };
}

export function formatMoney(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// ---------- lines ----------

function g(
  id: string,
  league: League,
  startsAt: string,
  away: string,
  home: string,
  awayLine: string,
  awaySpreadOdds: number,
  homeSpreadOdds: number,
  ml: [number, number],
  total: [string, number, number],
): Game {
  const homeLine = awayLine.startsWith("-") ? `+${awayLine.slice(1)}` : `-${awayLine.slice(1)}`;
  return {
    id,
    league,
    startsAt,
    away,
    home,
    markets: [
      {
        key: "spread",
        label: "Spread",
        options: [
          { label: away, line: awayLine, odds: awaySpreadOdds },
          { label: home, line: homeLine, odds: homeSpreadOdds },
        ],
      },
      {
        key: "moneyline",
        label: "Moneyline",
        options: [
          { label: away, odds: ml[0] },
          { label: home, odds: ml[1] },
        ],
      },
      {
        key: "total",
        label: "Total",
        options: [
          { label: "Over", line: `O ${total[0]}`, odds: total[1] },
          { label: "Under", line: `U ${total[0]}`, odds: total[2] },
        ],
      },
    ],
  };
}

export const LEAGUES: ("All" | League)[] = ["All", "NFL", "NBA", "MLB", "NHL"];

export const GAMES: Game[] = [
  g("nfl-buf-kc", "NFL", "Sun 4:25 PM ET", "Buffalo Bills", "Kansas City Chiefs", "+3", -110, -110, [125, -145], ["47.5", -110, -110]),
  g("nfl-sf-dal", "NFL", "Sun 8:20 PM ET", "San Francisco 49ers", "Dallas Cowboys", "-2.5", -115, -105, [-135, 115], ["49.5", -105, -115]),
  g("nfl-phi-nyg", "NFL", "Mon 8:15 PM ET", "Philadelphia Eagles", "New York Giants", "-7", -110, -110, [-300, 245], ["44.5", -110, -110]),
  g("nba-lal-bos", "NBA", "Today 7:30 PM ET", "Los Angeles Lakers", "Boston Celtics", "+5.5", -110, -110, [180, -210], ["224.5", -110, -110]),
  g("nba-gsw-den", "NBA", "Today 10:00 PM ET", "Golden State Warriors", "Denver Nuggets", "+2", -105, -115, [110, -130], ["231.5", -115, -105]),
  g("nba-nyk-mia", "NBA", "Tomorrow 7:00 PM ET", "New York Knicks", "Miami Heat", "-4", -110, -110, [-175, 150], ["218.5", -110, -110]),
  g("mlb-nyy-hou", "MLB", "Today 8:05 PM ET", "New York Yankees", "Houston Astros", "+1.5", -170, 150, [120, -140], ["8.5", -105, -115]),
  g("mlb-lad-sd", "MLB", "Today 9:40 PM ET", "Los Angeles Dodgers", "San Diego Padres", "-1.5", 130, -155, [-165, 140], ["7.5", -110, -110]),
  g("nhl-edm-col", "NHL", "Today 9:00 PM ET", "Edmonton Oilers", "Colorado Avalanche", "+1.5", -190, 160, [105, -125], ["6.5", -120, 100]),
  g("nhl-tor-bos", "NHL", "Tomorrow 7:00 PM ET", "Toronto Maple Leafs", "Boston Bruins", "+1.5", -210, 175, [-105, -115], ["5.5", -110, -110]),
];
