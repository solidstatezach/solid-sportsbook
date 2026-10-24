"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/book";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import type { Standing } from "@/lib/bets";

function winPct(s: Standing): string {
  const settled = s.wins + s.losses;
  if (settled === 0) return "—";
  return `${Math.round((s.wins / settled) * 100)}%`;
}

export default function LeaderboardPage() {
  const [standings, setStandings] = useState<Standing[] | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
        setNeedsLogin(true);
        return;
      }
      setMyId(user.id);
      // is_admin lands with the admin migration; until then this errors
      // quietly and the Admin link just stays hidden.
      const { data: adminRow } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (!active) return;
      setIsAdmin(Boolean((adminRow as { is_admin?: boolean } | null)?.is_admin));
      const { data, error } = await supabase
        .from("leaderboard_standings")
        .select("id, display_name, balance, wins, losses, pushes, total_wagered")
        .order("balance", { ascending: false });
      if (!active) return;
      if (error) {
        setLoadError(error.message);
        return;
      }
      setStandings((data ?? []) as Standing[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6">
      <Link href="/" className="text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-200">
        ← Back to the board
      </Link>

      <header className="mt-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400 text-lg font-black text-zinc-950 shadow-[0_8px_24px_rgba(163,230,53,0.3)]">
            S
          </div>
          <div>
            <h1 className="text-lg font-black uppercase leading-none tracking-wide text-zinc-50">
              Leader<span className="text-lime-300">board</span>
            </h1>
            <p className="mt-1 text-xs text-zinc-500">Bragging rights, ranked by bankroll</p>
          </div>
        </div>
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-white/30 hover:text-white"
          >
            Admin
          </Link>
        )}
      </header>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 shadow-lg shadow-black/30">
        {!isSupabaseEnabled ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-bold text-zinc-100">
              Leaderboard goes live when accounts are connected
            </p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-zinc-500">
              Once sign-ups open, every player starts with $1,000 in play money and the
              standings update as bets settle. Check back soon.
            </p>
          </div>
        ) : needsLogin ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-bold text-zinc-100">Log in to see the standings</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-zinc-500">
              The board is for players only.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-black uppercase tracking-wider text-zinc-950 transition-colors hover:bg-lime-300"
            >
              Log in
            </Link>
          </div>
        ) : loadError ? (
          <p className="px-5 py-10 text-center text-sm font-medium text-rose-200">
            Couldn&apos;t load the standings: {loadError}
          </p>
        ) : standings === null ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-500">Loading standings…</p>
        ) : standings.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-500">
            No players yet — be the first name on the board.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3 font-bold">#</th>
                  <th className="px-4 py-3 font-bold">Player</th>
                  <th className="px-4 py-3 text-right font-bold">Balance</th>
                  <th className="px-4 py-3 text-right font-bold">W–L</th>
                  <th className="px-4 py-3 text-right font-bold">Win %</th>
                  <th className="px-4 py-3 text-right font-bold">Wagered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {standings.map((s, i) => {
                  const mine = s.id === myId;
                  return (
                    <tr key={s.id} className={mine ? "bg-lime-300/[0.08]" : undefined}>
                      <td className="px-4 py-3 font-mono font-bold tabular-nums text-zinc-500">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 font-bold text-zinc-50">
                        {s.display_name ?? "Player"}
                        {mine && (
                          <span className="ml-2 rounded-full bg-lime-400 px-2 py-0.5 text-[10px] font-black uppercase text-zinc-950">
                            You
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-lime-300">
                        {formatMoney(Number(s.balance))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-300">
                        {s.wins}–{s.losses}
                        {s.pushes > 0 && <span className="text-zinc-500"> ({s.pushes} push)</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-300">
                        {winPct(s)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-400">
                        {formatMoney(Number(s.total_wagered))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
