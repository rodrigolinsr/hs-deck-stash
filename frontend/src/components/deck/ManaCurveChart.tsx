import type { DeckCard } from "@/lib/types";

interface ManaCurveChartProps {
  cards: DeckCard[];
  accent: string;
}

export default function ManaCurveChart({ cards, accent }: ManaCurveChartProps) {
  const buckets = Array.from({ length: 8 }, () => 0);
  for (const card of cards) {
    const index = Math.min(card.cost, 7);
    buckets[index] += card.count;
  }
  const max = Math.max(1, ...buckets);

  return (
    <div data-testid="mana-curve-chart">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Mana curve
      </p>
      <div className="grid h-32 grid-cols-8 items-end gap-2 pt-4">
        {buckets.map((value, cost) => (
          <div key={cost} className="flex h-full flex-col justify-end gap-1.5">
            <span className="text-center font-mono text-[10px] text-muted-foreground">{value}</span>
            <div
              className="rounded-t-md transition-all duration-300"
              style={{
                height: `${(value / max) * 100}%`,
                minHeight: value > 0 ? "4px" : "2px",
                background: value > 0 ? accent : "var(--input)",
                opacity: value > 0 ? 0.85 : 1,
              }}
            />
            <span className="text-center font-mono text-[10px] text-muted-foreground">
              {cost === 7 ? "7+" : cost}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
