import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RARITY_COLORS } from "@/lib/hsclasses";
import type { DeckCard } from "@/lib/types";

interface CardTileRowProps {
  card: DeckCard;
  index: number;
}

export default function CardTileRow({ card, index }: CardTileRowProps) {
  const rarityColor = RARITY_COLORS[card.rarity] ?? RARITY_COLORS.FREE;

  return (
    <Popover>
      <PopoverTrigger
        className="tile-in group relative flex w-full items-center overflow-hidden rounded-md border border-border bg-card text-left transition-transform duration-150 hover:translate-x-1 hover:border-amber-500/40"
        style={{ animationDelay: `${Math.min(index * 18, 400)}ms` }}
        data-testid={`card-row-${card.dbf_id}`}
      >
        <span className="flex size-9 shrink-0 items-center justify-center bg-primary font-mono text-sm font-semibold text-primary-foreground">
          {card.cost}
        </span>
        <span className="relative flex min-w-0 flex-1 items-center">
          {card.tile_url ? (
            <img
              src={card.tile_url}
              alt=""
              loading="lazy"
              className="absolute right-0 h-9 w-[220px] max-w-full object-cover opacity-20 dark:opacity-60"
              style={{
                maskImage: "linear-gradient(to right, transparent, black 55%)",
                WebkitMaskImage: "linear-gradient(to right, transparent, black 55%)",
              }}
            />
          ) : null}
          <span className="relative z-10 truncate px-3 py-2 text-sm font-medium text-foreground dark:text-white dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {card.name}
          </span>
        </span>
        <span
          className="relative z-10 mr-2 shrink-0 rounded px-2 py-0.5 font-mono text-xs font-bold"
          style={{ color: rarityColor }}
          data-testid={`card-count-${card.dbf_id}`}
        >
          {card.rarity === "LEGENDARY" ? "★" : `${card.count}×`}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] border-border bg-popover p-3 shadow-xl"
        side="right"
        data-testid={`card-preview-${card.dbf_id}`}
      >
        {card.render_url ? (
          <img src={card.render_url} alt={card.name} className="mx-auto w-full max-w-[280px]" />
        ) : (
          <p className="text-sm text-muted-foreground">No art available for this card.</p>
        )}
        <p className="mt-2 text-center font-mono text-xs text-muted-foreground">
          {card.rarity} · {card.type}
        </p>
      </PopoverContent>
    </Popover>
  );
}
