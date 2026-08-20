import { Link } from "react-router-dom";
import { Copy, MousePointer2, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { classTheme } from "@/lib/hsclasses";
import type { DeckSummary } from "@/lib/types";

interface DeckCardProps { deck: DeckSummary; onCopy: (deck: DeckSummary) => void; onEdit: (deck: DeckSummary) => void; onDelete: (deck: DeckSummary) => void; }

export default function DeckCard({ deck, onCopy, onEdit, onDelete }: DeckCardProps) {
  const theme = classTheme(deck.hero_class);
  return <article className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg" style={{ borderColor: `${theme.color}55` }} data-testid={`deck-card-${deck.id}`}>
    <Link to={`/decks/${deck.id}`} aria-label={`Open ${deck.name}`} className="relative block h-28 cursor-pointer overflow-hidden" style={{ background: theme.bg }}>
      {theme.image ? <img src={theme.image} alt="" className="size-full object-cover object-[center_50%] opacity-75 transition-transform duration-500 group-hover:scale-105" /> : null}
      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-black/60" />
      <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: theme.color }} />
      <div className="absolute bottom-3 left-5 flex items-center gap-2.5 text-white drop-shadow">
        {theme.icon ? <img src={theme.icon} alt="" className="size-10" /> : null}
        <p className="font-heading text-xl font-semibold leading-none">{deck.hero_class_name}<span className="ml-2 text-base font-medium text-white/80">· {deck.format}</span></p>
      </div>
      <span className="absolute right-4 top-3 rounded-md border border-white/30 bg-black/35 px-2 py-1 font-mono text-xs text-white">{deck.card_count} cards</span>
      <span className="absolute right-4 top-11 flex items-center gap-1 text-xs font-medium text-white/0 transition-colors group-hover:text-white/85"><MousePointer2 className="size-3.5" />Open deck</span>
    </Link>
    <div className="p-5">
      <Link to={`/decks/${deck.id}`} className="block cursor-pointer truncate font-heading text-xl font-semibold leading-tight transition-colors hover:text-amber-600 hover:underline hover:underline-offset-4 dark:hover:text-amber-400" data-testid={`deck-name-link-${deck.id}`}>{deck.name}</Link>
      {deck.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{deck.tags.map((tag) => <Badge key={tag} variant="outline" className="border-border text-muted-foreground" data-testid={`deck-tag-${deck.id}-${tag}`}>{tag}</Badge>)}</div>}
      {deck.notes ? <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{deck.notes}</p> : <p className="mt-3 h-10 text-sm text-muted-foreground/70">{deck.hero_name}</p>}
      <p className="mt-4 truncate font-mono text-[11px] text-muted-foreground/70">{deck.code}</p>
      <div className="mt-4 flex items-center gap-2"><Button size="sm" onClick={() => onCopy(deck)} className="bg-amber-600 text-white hover:bg-amber-500 dark:text-black" data-testid={`copy-code-button-${deck.id}`}><Copy className="mr-1.5 size-3.5" />Copy code</Button><Link to={`/decks/${deck.id}`} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" data-testid={`deck-open-button-${deck.id}`}>Open</Link><div className="ml-auto flex items-center"><Button variant="ghost" size="icon-sm" aria-label={`Edit ${deck.name}`} onClick={() => onEdit(deck)} className="text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400" data-testid={`edit-deck-button-${deck.id}`}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon-sm" aria-label={`Delete ${deck.name}`} onClick={() => onDelete(deck)} className="text-muted-foreground hover:text-red-500" data-testid={`delete-deck-button-${deck.id}`}><Trash2 className="size-4" /></Button></div></div>
    </div>
  </article>;
}
