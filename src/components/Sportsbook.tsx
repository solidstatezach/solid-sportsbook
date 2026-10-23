"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import {
  GAMES,
  LEAGUES,
  combineOdds,
  formatAmerican,
  formatMoney,
  payoutFor,
  type Game,
  type League,
  type Market,
  type MarketOption,
  type PlacedBet,
  type Selection,
} from "@/lib/book";
import { dbBetToPlacedBet, serializeLeg, type DbBet, type Profile } from "@/lib/bets";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import GameCard from "./GameCard";
import BetSlip from "./BetSlip";

export default function Sportsbook() {
  const [league, setLeague] = useState<(typeof LEAGUES)[number]>("All");
  const [selections, setSelections] = useState<Map<string, Selection>>(new Map());
  const [stake, setStake] = useState("25");
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);
  const [justPlaced, setJustPlaced] = useState(false);
  const [mobileSlipOpen, setMobileSlipOpen] = useState(false);

  // account state (Supabase mode only; all inert in local mode)
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dbBets, setDbBets] = useState<DbBet[]>([]);
  const [authReady, setAuthReady] = useState(!isSupabaseEnabled);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const accountMode = isSupabaseEnabled && user !== null;

  useEffect(() => {
    if (!isSupabaseEnabled) return;
    const supabase = createClient();
    let active = true;

    async function load(u: User | null) {
      if (!active) return;
      setUser(u);
      if (!u) {
        setProfile(null);
        setDbBets([]);
        setAuthReady(true);
        return;
      }
      const [{ data: prof }, { data: bets }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, balance")
          .eq("id", u.id)
          .single(),
        supabase
          .from("bets")
          .select("*")
          .eq("user_id", u.id)
          .order("placed_at", { ascending: false }),
      ]);
      if (!active) return;
      setProfile((prof as Profile | null) ?? null);
      setDbBets((bets as DbBet[] | null) ?? []);
      setAuthReady(true);
    }

    supabase.auth.getUser().then(({ data }) => load(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function refreshProfile(userId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, balance")
      .eq("id", userId)
      .single();
    if (data) setProfile(data as Profile);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  const games = useMemo(
    () => (league === "All" ? GAMES : GAMES.filter((g) => g.league === (league as League))),
    [league],
  );
  const legs = useMemo(() => [...selections.values()], [selections]);
  const myBets = useMemo(
    () => (accountMode ? dbBets.map(dbBetToPlacedBet) : placedBets),
    [accountMode, dbBets, placedBets],
  );

  function toggle(game: Game, market: Market, option: MarketOption, optionIndex: number) {
    const id = `${game.id}:${market.key}:${optionIndex}`;
    setJustPlaced(false);
    setPlaceError(null);
    setSelections((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // one pick per market per game — switching sides replaces the old pick
        for (const key of [...next.keys()]) {
          if (key.startsWith(`${game.id}:${market.key}:`)) next.delete(key);
        }
        next.set(id, {
          id,
          gameId: game.id,
          league: game.league,
          matchup: `${game.away} @ ${game.home}`,
          market: market.label,
          pick: option.line ? `${option.label} ${option.line.replace(/^[OU] /, "")}`.trim() : option.label,
          label: option.label,
          line: option.line ? option.line.replace(/^[OU] /, "") : undefined,
          odds: option.odds,
        });
      }
      return next;
    });
  }

  async function placeBet(): Promise<boolean> {
    const stakeNum = parseFloat(stake);
    if (!Number.isFinite(stakeNum) || stakeNum <= 0 || legs.length === 0) return false;
    const combined = combineOdds(legs);
    const { toWin, payout } = payoutFor(stakeNum, combined);

    if (accountMode && user) {
      setPlacing(true);
      setPlaceError(null);
      const supabase = createClient();
      const { data, error } = await supabase.rpc("place_bet", {
        p_kind: legs.length > 1 ? "parlay" : "single",
        p_legs: legs.map(serializeLeg),
        p_stake: stakeNum,
        p_combined_odds: combined,
        p_potential_payout: payout,
      });
      setPlacing(false);
      if (error) {
        setPlaceError(error.message);
        return false;
      }
      if (data) setDbBets((prev) => [data as DbBet, ...prev]);
      await refreshProfile(user.id);
      setSelections(new Map());
      setJustPlaced(true);
      return true;
    }

    // local mode: bets live in state, nothing is saved anywhere
    setPlacedBets((prev) => [
      {
        id: `bet-${Date.now()}`,
        legs,
        stake: stakeNum,
        combinedOdds: combined,
        toWin,
        payout,
      },
      ...prev,
    ]);
    setSelections(new Map());
    setJustPlaced(true);
    return true;
  }

  function removeSelection(id: string) {
    setSelections((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  const mobileCombined = combineOdds(legs);
  const mobileStake = parseFloat(stake);
  const mobilePayout =
    Number.isFinite(mobileStake) && mobileStake > 0 && legs.length > 0
      ? payoutFor(mobileStake, mobileCombined).payout
      : 0;

  const displayName =
    profile?.display_name ?? user?.email?.split("@")[0] ?? "Player";

  const chipClass =
    "rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-300";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-32 sm:px-6 lg:pb-10">
      {/* header */}
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400 text-lg font-black text-zinc-950 shadow-[0_8px_24px_rgba(163,230,53,0.3)]">
            S
          </div>
          <div>
            <h1 className="text-lg font-black uppercase leading-none tracking-wide text-zinc-50">
              Solid <span className="text-lime-300">Sportsbook</span>
            </h1>
            <p className="mt-1 text-xs text-zinc-500">Betting board</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/leaderboard" className={`${chipClass} transition-colors hover:border-white/30 hover:text-white`}>
            Leaderboard
          </Link>
          {!isSupabaseEnabled ? (
            <span className={chipClass}>
              Balance <span className="font-mono font-bold text-lime-300">$1,000.00</span>
            </span>
          ) : !authReady ? null : accountMode ? (
            <>
              <span className={chipClass}>
                {displayName} · Balance{" "}
                <span className="font-mono font-bold text-lime-300">
                  {formatMoney(Number(profile?.balance ?? 0))}
                </span>
              </span>
              <button
                type="button"
                onClick={signOut}
                className={`${chipClass} transition-colors hover:border-white/30 hover:text-white`}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={`${chipClass} transition-colors hover:border-white/30 hover:text-white`}>
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-lime-400 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-zinc-950 transition-colors hover:bg-lime-300"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>

      {/* league filter */}
      <nav className="sticky top-0 z-20 -mx-4 border-b border-white/[0.06] bg-zinc-950/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex gap-2 overflow-x-auto">
          {LEAGUES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLeague(l)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-all ${
                league === l
                  ? "bg-zinc-50 text-zinc-950"
                  : "border border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/30 hover:text-white"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </nav>

      <div className="mt-5 grid flex-1 items-start gap-5 lg:grid-cols-[1fr_340px]">
        {/* board */}
        <main className="flex flex-col gap-4">
          {games.map((game) => (
            <GameCard key={game.id} game={game} selections={selections} onToggle={toggle} />
          ))}
        </main>

        {/* slip — desktop sidebar */}
        <aside className="sticky top-[68px] hidden lg:block">
          <BetSlip
            selections={legs}
            stake={stake}
            onStakeChange={setStake}
            onRemove={removeSelection}
            onClear={() => setSelections(new Map())}
            onPlace={placeBet}
            placedBets={myBets}
            justPlaced={justPlaced}
            placing={placing}
            placeError={placeError}
          />
        </aside>
      </div>

      {/* slip — mobile bottom bar + sheet */}
      <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
        {mobileSlipOpen && (
          <div className="max-h-[70vh] overflow-y-auto border-t border-white/10 bg-zinc-950 px-4 pb-4 pt-3 shadow-[0_-16px_40px_rgba(0,0,0,0.6)]">
            <BetSlip
              selections={legs}
              stake={stake}
              onStakeChange={setStake}
              onRemove={removeSelection}
              onClear={() => setSelections(new Map())}
              onPlace={async () => {
                if (await placeBet()) setMobileSlipOpen(false);
              }}
              placedBets={myBets}
              justPlaced={justPlaced}
              placing={placing}
              placeError={placeError}
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => setMobileSlipOpen((o) => !o)}
          className="flex w-full items-center justify-between bg-lime-400 px-5 py-4 text-zinc-950 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]"
        >
          <span className="text-sm font-black uppercase tracking-wide">
            Bet slip {legs.length > 0 && `· ${legs.length} pick${legs.length > 1 ? "s" : ""}`}
          </span>
          <span className="font-mono text-sm font-bold tabular-nums">
            {legs.length > 0
              ? `${formatAmerican(mobileCombined)} · pays ${formatMoney(mobilePayout)}`
              : "Tap odds to build a bet"}
          </span>
        </button>
      </div>
    </div>
  );
}
