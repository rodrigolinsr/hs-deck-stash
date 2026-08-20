import { Link } from "react-router-dom";
import { Copy, ExternalLink, Folder, Gamepad2, Globe2, Link2, MousePointer2, Pencil, Trophy, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { classTheme } from "@/lib/hsclasses";
import type { DeckSummary, HsReplayDeckStat } from "@/lib/types";

interface DeckCardProps { deck: DeckSummary; folderName?: string; stat?: HsReplayDeckStat; statsLoading?: boolean; sharePending?: boolean; onCopy: (deck: DeckSummary) => void; onShare: (deck: DeckSummary) => void; onEdit: (deck: DeckSummary) => void; onDelete: (deck: DeckSummary) => void; }

export default function DeckCard({ deck, folderName, stat, statsLoading = false, sharePending = false, onCopy, onShare, onEdit, onDelete }: DeckCardProps) {
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
      {(folderName || deck.tags.length > 0) && <div className="mt-3 flex flex-wrap gap-1.5">{folderName ? <Badge variant="secondary" className="gap-1.5 text-muted-foreground" data-testid={`deck-folder-${deck.id}`}><Folder className="size-3 text-amber-600 dark:text-amber-400" />{folderName}</Badge> : null}{deck.tags.map((tag) => <Badge key={tag} variant="outline" className="border-border text-muted-foreground" data-testid={`deck-tag-${deck.id}-${tag}`}>{tag}</Badge>)}</div>}
      {statsLoading ? <p className="mt-3 text-xs text-muted-foreground">Loading HSReplay stats…</p> : stat ? <a href={`https://hsreplay.net/decks/${stat.hsreplay_deck_id}/#gameType=${stat.game_type}`} target="_blank" rel="noreferrer" className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-3 rounded-lg border border-sky-500/25 bg-sky-500/5 px-3 py-2.5 transition-colors hover:bg-sky-500/10" data-testid={`hsreplay-stats-${deck.id}`} aria-label={`View HSReplay statistics for ${deck.name}`}><dl><dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"><Trophy className="size-3 text-sky-600 dark:text-sky-400" />Winrate</dt><dd className="mt-1 font-heading text-lg font-semibold leading-none text-sky-700 dark:text-sky-300">{stat.win_rate.toFixed(0)}%</dd></dl><dl><dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"><Gamepad2 className="size-3 text-sky-600 dark:text-sky-400" />Games</dt><dd className="mt-1 font-heading text-lg font-semibold leading-none">{stat.total_games.toLocaleString()}</dd></dl><ExternalLink className="mb-0.5 size-3.5 text-muted-foreground" aria-hidden="true" /></a> : null}
      {deck.notes ? <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{deck.notes}</p> : <p className="mt-3 h-10 text-sm text-muted-foreground/70">{deck.hero_name}</p>}
      <p className="mt-4 truncate font-mono text-[11px] text-muted-foreground/70">{deck.code}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2"><Button size="sm" onClick={() => onCopy(deck)} className="bg-amber-600 text-white hover:bg-amber-500 dark:text-black" data-testid={`copy-code-button-${deck.id}`}><Copy className="mr-1.5 size-3.5" />Copy code</Button><Link to={`/decks/${deck.id}`} className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" data-testid={`deck-open-button-${deck.id}`}>Open</Link><Button size="sm" variant="outline" onClick={() => onShare(deck)} disabled={sharePending} data-testid={`share-deck-button-${deck.id}`}>{deck.is_public ? <Link2 className="mr-1.5 size-3.5" /> : <Globe2 className="mr-1.5 size-3.5" />}{deck.is_public ? "Copy link" : "Share"}</Button><div className="ml-auto flex items-center"><Button variant="ghost" size="icon-sm" aria-label={`Edit ${deck.name}`} onClick={() => onEdit(deck)} className="text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400" data-testid={`edit-deck-button-${deck.id}`}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon-sm" aria-label={`Delete ${deck.name}`} onClick={() => onDelete(deck)} className="text-muted-foreground hover:text-red-500" data-testid={`delete-deck-button-${deck.id}`}><Trash2 className="size-4" /></Button></div></div>
    </div>
  </article>;
}
