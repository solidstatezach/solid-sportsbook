import {
  combineOdds,
  formatAmerican,
  formatMoney,
  payoutFor,
  type PlacedBet,
  type Selection,
} from "@/lib/book";

interface Props {
  selections: Selection[];
  stake: string;
  onStakeChange: (value: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onPlace: () => void;
  placedBets: PlacedBet[];
  justPlaced: boolean;
}

const QUICK_STAKES = [5, 10, 25, 50, 100];

export default function BetSlip({
  selections,
  stake,
  onStakeChange,
  onRemove,
  onClear,
  onPlace,
  placedBets,
  justPlaced,
}: Props) {
  const stakeNum = parseFloat(stake);
  const validStake = Number.isFinite(stakeNum) && stakeNum > 0;
  const combined = combineOdds(selections);
  const { toWin, payout } = validStake && selections.length > 0
    ? payoutFor(stakeNum, combined)
    : { toWin: 0, payout: 0 };
  const isParlay = selections.length > 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 shadow-lg shadow-black/30">
        <header className="flex items-center justify-between bg-white/[0.03] px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-100">
            Bet Slip
            {selections.length > 0 && (
              <span className="ml-2 rounded-full bg-lime-400 px-2 py-0.5 text-[11px] font-black text-zinc-950">
                {selections.length}
              </span>
            )}
          </h2>
          {selections.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-100 hover:underline"
            >
              Clear all
            </button>
          )}
        </header>

        {selections.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium text-zinc-300">Your slip is empty</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Tap any odds to add a pick. Stack picks to build a parlay.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-white/[0.06]">
              {selections.map((leg) => (
                <li key={leg.id} className="leg-in flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-zinc-50">{leg.pick}</p>
                    <p className="truncate text-xs text-zinc-400">
                      {leg.market} · {leg.matchup}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-md bg-white/[0.06] px-2 py-1 font-mono text-xs font-bold tabular-nums text-lime-300">
                      {formatAmerican(leg.odds)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${leg.pick}`}
                      onClick={() => onRemove(leg.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-100"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="space-y-3 border-t border-white/[0.06] px-4 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-400">
                  {isParlay ? `${selections.length}-leg parlay` : "Single"} odds
                </span>
                <span className="font-mono text-base font-black tabular-nums text-zinc-50">
                  {formatAmerican(combined)}
                </span>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Stake
                </span>
                <div className="flex items-center rounded-lg border border-white/10 bg-zinc-950 px-3 focus-within:border-lime-300/60">
                  <span className="text-sm font-bold text-zinc-500">$</span>
                  <input
                    inputMode="decimal"
                    value={stake}
                    onChange={(e) => onStakeChange(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="0.00"
                    className="w-full bg-transparent px-2 py-2.5 font-mono text-base font-bold tabular-nums text-zinc-50 outline-none placeholder:text-zinc-600"
                  />
                </div>
              </label>

              <div className="flex gap-1.5">
                {QUICK_STAKES.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => onStakeChange(String(amt))}
                    className={`flex-1 rounded-md border py-1.5 text-xs font-bold transition-colors ${
                      stakeNum === amt
                        ? "border-lime-300/60 bg-lime-300/15 text-lime-300"
                        : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/25 hover:text-zinc-100"
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-400">To win</dt>
                  <dd className="font-mono font-bold tabular-nums text-lime-300">
                    {formatMoney(toWin)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-400">Total payout</dt>
                  <dd className="font-mono font-bold tabular-nums text-zinc-50">
                    {formatMoney(payout)}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                disabled={!validStake}
                onClick={onPlace}
                className="w-full rounded-xl bg-lime-400 py-3 text-sm font-black uppercase tracking-wider text-zinc-950 shadow-[0_8px_24px_rgba(163,230,53,0.25)] transition-all hover:bg-lime-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:shadow-none"
              >
                {validStake ? `Place demo bet · ${formatMoney(stakeNum)}` : "Enter a stake"}
              </button>
              <p className="text-center text-[11px] text-zinc-500">
                Demo only — no real money, no real wagers.
              </p>
            </div>
          </>
        )}
      </div>

      {justPlaced && (
        <div className="leg-in rounded-2xl border border-lime-300/40 bg-lime-300/10 px-4 py-3 text-sm font-semibold text-lime-200">
          ✓ Demo bet placed — good luck. It&apos;s in your bets below.
        </div>
      )}

      {placedBets.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80">
          <h3 className="border-b border-white/[0.06] px-4 py-3 text-sm font-bold uppercase tracking-wider text-zinc-100">
            My demo bets
          </h3>
          <ul className="divide-y divide-white/[0.06]">
            {placedBets.map((bet) => (
              <li key={bet.id} className="px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-zinc-100">
                    {bet.legs.length > 1 ? `${bet.legs.length}-leg parlay` : "Single"}
                    <span className="ml-2 font-mono text-xs font-bold text-lime-300">
                      {formatAmerican(bet.combinedOdds)}
                    </span>
                  </span>
                  <span className="font-mono text-xs tabular-nums text-zinc-400">
                    {formatMoney(bet.stake)} → {formatMoney(bet.payout)}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {bet.legs.map((l) => l.pick).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
