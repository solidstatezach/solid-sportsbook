"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatAmerican, formatMoney } from "@/lib/book";
import type { BetLeg, DbBet, Standing } from "@/lib/bets";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseEnabled } from "@/lib/supabase/config";

type Gate = "checking" | "login" | "denied" | "ready";
type SettleResult = "won" | "lost" | "push";

function LegLine({ leg }: { leg: BetLeg }) {
  return (
    <p className="text-xs leading-relaxed">
      <span className="font-bold text-zinc-100">
        {leg.pickLabel}
        {leg.line ? ` ${leg.line}` : ""}
      </span>{" "}
      <span className="text-zinc-500">
        · {leg.market} · {leg.matchup} · {formatAmerican(leg.oddsAmerican)}
      </span>
    </p>
  );
}

export default function AdminPage() {
  const [gate, setGate] = useState<Gate>("checking");
  const [pendingBets, setPendingBets] = useState<DbBet[] | null>(null);
  const [standings, setStandings] = useState<Standing[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [myId, setMyId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const [betsRes, standingsRes, profilesRes] = await Promise.all([
      supabase
        .from("bets")
        .select("*")
        .eq("status", "pending")
        .order("placed_at", { ascending: true }),
      supabase
        .from("leaderboard_standings")
        .select("id, display_name, balance, wins, losses, pushes, total_wagered")
        .order("balance", { ascending: false }),
      supabase.from("profiles").select("id, display_name"),
    ]);
    if (betsRes.error) {
      setLoadError(betsRes.error.message);
      return;
    }
    if (standingsRes.error) {
      setLoadError(standingsRes.error.message);
      return;
    }
    setLoadError(null);
    setPendingBets((betsRes.data ?? []) as DbBet[]);
    setStandings((standingsRes.data ?? []) as Standing[]);
    setNames(
      new Map(
        ((profilesRes.data ?? []) as { id: string; display_name: string | null }[]).map(
          (p) => [p.id, p.display_name ?? "Player"],
        ),
      ),
    );
  }, []);

  useEffect(() => {
    if (!isSupabaseEnabled) return;
    let active = true;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setGate("login");
        return;
      }
      setMyId(user.id);
      const { data: prof } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (!active) return;
      if (!prof?.is_admin) {
        setGate("denied");
        return;
      }
      setGate("ready");
      await loadData();
    })();
    return () => {
      active = false;
    };
  }, [loadData]);

  async function settle(bet: DbBet, result: SettleResult) {
    if (settlingId) return;
    setSettlingId(bet.id);
    setActionError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("settle_bet", {
      p_bet_id: bet.id,
      p_result: result,
    });
    if (error) {
      setActionError(error.message);
    } else {
      await loadData();
    }
    setSettlingId(null);
  }

  async function adjust(playerId: string) {
    const amount = parseFloat(amounts[playerId] ?? "");
    if (!Number.isFinite(amount) || amount === 0) {
      setAdjustError("Enter an amount first — e.g. 500 to top up, -50 to deduct.");
      return;
    }
    setAdjustingId(playerId);
    setAdjustError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_adjust_balance", {
      p_user_id: playerId,
      p_amount: amount,
    });
    if (error) {
      setAdjustError(error.message);
    } else {
      setAmounts((prev) => ({ ...prev, [playerId]: "" }));
      await loadData();
    }
    setAdjustingId(null);
  }

  const panelClass =
    "mt-6 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 shadow-lg shadow-black/30";
  const settleBtn =
    "rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6">
      <Link href="/" className="text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-200">
        ← Back to the board
      </Link>

      <header className="mt-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400 text-lg font-black text-zinc-950 shadow-[0_8px_24px_rgba(163,230,53,0.3)]">
          S
        </div>
        <div>
          <h1 className="text-lg font-black uppercase leading-none tracking-wide text-zinc-50">
            Book <span className="text-lime-300">Admin</span>
          </h1>
          <p className="mt-1 text-xs text-zinc-500">Settle bets and top up players</p>
        </div>
      </header>

      {!isSupabaseEnabled ? (
        <div className={panelClass}>
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-bold text-zinc-100">
              Admin goes live when accounts are connected
            </p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-zinc-500">
              Settling bets and adjusting balances work on real player accounts, so the
              book needs Supabase connected first (env vars + migrations — see the
              README). In local mode there are no accounts to run.
            </p>
          </div>
        </div>
      ) : gate === "checking" ? (
        <div className={panelClass}>
          <p className="px-5 py-10 text-center text-sm text-zinc-500">Checking your access…</p>
        </div>
      ) : gate === "login" ? (
        <div className={panelClass}>
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-bold text-zinc-100">Log in to run the book</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-zinc-500">
              The admin page is for the book&apos;s admin account only.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-black uppercase tracking-wider text-zinc-950 transition-colors hover:bg-lime-300"
            >
              Log in
            </Link>
          </div>
        </div>
      ) : gate === "denied" ? (
        <div className={panelClass}>
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-bold text-zinc-100">Not authorized</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-zinc-500">
              This account isn&apos;t flagged as an admin, so it can&apos;t settle bets or
              move balances. If you run the book, flip <span className="font-mono">is_admin</span> on
              your own profile in the Supabase SQL editor (one line — see the README).
            </p>
          </div>
        </div>
      ) : loadError ? (
        <div className={panelClass}>
          <p className="px-5 py-10 text-center text-sm font-medium text-rose-200">
            Couldn&apos;t load the book: {loadError}
          </p>
        </div>
      ) : (
        <>
          {/* ---------- pending bets ---------- */}
          <section className={panelClass}>
            <h2 className="border-b border-white/[0.06] bg-white/[0.03] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Pending bets{pendingBets ? ` (${pendingBets.length})` : ""}
            </h2>
            {actionError && (
              <p className="border-b border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-xs font-medium text-rose-200">
                {actionError}
              </p>
            )}
            {pendingBets === null ? (
              <p className="px-5 py-10 text-center text-sm text-zinc-500">Loading bets…</p>
            ) : pendingBets.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-zinc-500">
                Nothing to settle — every bet is graded.
              </p>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {pendingBets.map((bet) => {
                  const settling = settlingId === bet.id;
                  const busy = settlingId !== null;
                  return (
                    <li key={bet.id} className="px-4 py-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-bold text-zinc-50">
                          {names.get(bet.user_id) ?? "Player"}
                          <span className="ml-2 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                            {bet.kind === "parlay"
                              ? `Parlay · ${bet.legs?.length ?? 0} legs`
                              : "Single"}
                          </span>
                        </p>
                        <p className="text-[11px] tabular-nums text-zinc-500">
                          {new Date(bet.placed_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="mt-2 flex flex-col gap-1">
                        {(bet.legs ?? []).map((leg, i) => (
                          <LegLine key={i} leg={leg} />
                        ))}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs tabular-nums">
                        <span className="text-zinc-400">
                          Stake{" "}
                          <span className="font-bold text-zinc-100">
                            {formatMoney(Number(bet.stake))}
                          </span>
                        </span>
                        <span className="text-zinc-400">
                          Odds{" "}
                          <span className="font-bold text-zinc-100">
                            {formatAmerican(bet.combined_odds_american)}
                          </span>
                        </span>
                        <span className="text-zinc-400">
                          Pays{" "}
                          <span className="font-bold text-lime-300">
                            {formatMoney(Number(bet.potential_payout))}
                          </span>
                        </span>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => settle(bet, "won")}
                          className={`${settleBtn} bg-lime-400 text-zinc-950 hover:bg-lime-300`}
                        >
                          {settling ? "…" : "Won"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => settle(bet, "lost")}
                          className={`${settleBtn} border border-rose-400/40 text-rose-200 hover:bg-rose-400/10`}
                        >
                          Lost
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => settle(bet, "push")}
                          className={`${settleBtn} border border-white/15 text-zinc-200 hover:bg-white/[0.06]`}
                        >
                          Push
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ---------- players ---------- */}
          <section className={panelClass}>
            <h2 className="border-b border-white/[0.06] bg-white/[0.03] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Players
            </h2>
            {adjustError && (
              <p className="border-b border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-xs font-medium text-rose-200">
                {adjustError}
              </p>
            )}
            {standings === null ? (
              <p className="px-5 py-10 text-center text-sm text-zinc-500">Loading players…</p>
            ) : standings.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-zinc-500">No players yet.</p>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {standings.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-zinc-50">
                        {s.display_name ?? "Player"}
                        {s.id === myId && (
                          <span className="ml-2 rounded-full bg-lime-400 px-2 py-0.5 text-[10px] font-black uppercase text-zinc-950">
                            You
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs tabular-nums text-zinc-500">
                        {s.wins}–{s.losses}
                        {s.pushes > 0 && ` (${s.pushes} push)`} · wagered{" "}
                        {formatMoney(Number(s.total_wagered))}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="mr-1 font-mono text-sm font-bold tabular-nums text-lime-300">
                        {formatMoney(Number(s.balance))}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={amounts[s.id] ?? ""}
                        onChange={(e) =>
                          setAmounts((prev) => ({ ...prev, [s.id]: e.target.value }))
                        }
                        placeholder="500"
                        aria-label={`Adjust balance for ${s.display_name ?? "player"}`}
                        className="w-20 rounded-lg border border-white/10 bg-zinc-950 px-2 py-1.5 font-mono text-sm tabular-nums text-zinc-50 placeholder:text-zinc-600 focus:border-lime-300/50 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={adjustingId !== null}
                        onClick={() => adjust(s.id)}
                        className="rounded-lg bg-lime-400 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-zinc-950 transition-colors hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {adjustingId === s.id ? "…" : "Add"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="border-t border-white/[0.06] px-4 py-3 text-[11px] leading-relaxed text-zinc-500">
              Add credits play money to a balance — a rebuy when a friend busts out. A
              negative amount deducts; a balance can never go below zero.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
