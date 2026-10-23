import { formatAmerican, type MarketOption } from "@/lib/book";

interface Props {
  option: MarketOption;
  selected: boolean;
  onToggle: () => void;
}

/** A single clickable odds cell. Selected = filled accent, like the big books.
 *  Shows the line when the market has one; moneyline cells are odds-only —
 *  the team is named by the row the cell sits in. */
export default function OddsButton({ option, selected, onToggle }: Props) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`group flex min-h-[52px] w-full flex-col items-center justify-center rounded-lg border px-2 py-2 transition-all duration-150 active:scale-[0.97] ${
        selected
          ? "border-lime-300 bg-lime-400 text-zinc-950 shadow-[0_0_18px_rgba(163,230,53,0.35)]"
          : "border-white/10 bg-white/[0.04] text-zinc-100 hover:border-lime-300/50 hover:bg-lime-300/10"
      }`}
    >
      {option.line && (
        <span
          className={`text-[11px] font-medium leading-tight ${
            selected ? "text-zinc-700" : "text-zinc-400"
          }`}
        >
          {option.line}
        </span>
      )}
      <span className="font-mono text-sm font-bold leading-tight tabular-nums">
        {formatAmerican(option.odds)}
      </span>
    </button>
  );
}
