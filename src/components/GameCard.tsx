import type { Game, Market, MarketOption, Selection } from "@/lib/book";
import OddsButton from "./OddsButton";

interface Props {
  game: Game;
  selections: Map<string, Selection>;
  onToggle: (game: Game, market: Market, option: MarketOption, optionIndex: number) => void;
}

const LEAGUE_STYLES: Record<Game["league"], string> = {
  NFL: "bg-red-500/15 text-red-300 border-red-400/20",
  NBA: "bg-orange-500/15 text-orange-300 border-orange-400/20",
  MLB: "bg-sky-500/15 text-sky-300 border-sky-400/20",
  NHL: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20",
};

export default function GameCard({ game, selections, onToggle }: Props) {
  const teams = [game.away, game.home];
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 shadow-lg shadow-black/30">
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <span
          className={`rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-widest ${LEAGUE_STYLES[game.league]}`}
        >
          {game.league}
        </span>
        <span className="text-xs font-medium text-zinc-400">{game.startsAt}</span>
      </header>

      {/* column headers */}
      <div className="grid grid-cols-[1fr_repeat(3,64px)] items-center gap-2 px-4 pt-3 sm:grid-cols-[1fr_repeat(3,84px)]">
        <span />
        {game.markets.map((m) => (
          <span
            key={m.key}
            className="text-center text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
          >
            {m.label}
          </span>
        ))}
      </div>

      {teams.map((team, row) => (
        <div
          key={team}
          className="grid grid-cols-[1fr_repeat(3,64px)] items-center gap-2 px-4 py-2 last:pb-4 sm:grid-cols-[1fr_repeat(3,84px)]"
        >
          <span className="truncate pr-1 text-sm font-semibold text-zinc-100">
            {team}
            <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              {row === 0 ? "Away" : "Home"}
            </span>
          </span>
          {game.markets.map((market) => {
            const option = market.options[row];
            const id = `${game.id}:${market.key}:${row}`;
            return (
              <OddsButton
                key={market.key}
                option={option}
                selected={selections.has(id)}
                onToggle={() => onToggle(game, market, option, row)}
              />
            );
          })}
        </div>
      ))}
    </section>
  );
}
