import { Link } from "react-router-dom";
import { Copy, Layers3, UsersRound, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { classTheme } from "@/lib/hsclasses";
import type { PublicDeckSummary } from "@/lib/types";

export default function PublicDeckCard({ deck, showAuthor = true }: { deck: PublicDeckSummary; showAuthor?: boolean }) {
  const theme = classTheme(deck.hero_class);

  async function copyCode() {
    const copied = await copyText(deck.code);
    toast[copied ? "success" : "error"](copied ? "Deck code copied — paste it in Hearthstone" : "Could not copy the deck code");
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg" style={{ borderColor: `${theme.color}55` }}>
      <Link to={`/public/decks/${deck.id}`} className="relative block h-28 overflow-hidden" style={{ background: theme.bg }}>
        {theme.image ? <img src={theme.image} alt="" className="size-full object-cover opacity-75 transition-transform duration-500 group-hover:scale-105" /> : null}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-black/55" />
        <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: theme.color }} />
        <div className="absolute bottom-3 left-4 flex items-center gap-2 text-white">
          {theme.icon ? <img src={theme.icon} alt="" className="size-8" /> : null}
          <span className="font-heading text-lg font-semibold">{deck.hero_class_name}</span>
        </div>
        <span className="absolute right-3 top-3 rounded-md border border-white/25 bg-black/35 px-2 py-1 font-mono text-xs text-white">{deck.card_count} cards</span>
      </Link>
      <div className="p-5">
        <Link to={`/public/decks/${deck.id}`} className="block truncate font-heading text-xl font-semibold hover:text-amber-600 hover:underline hover:underline-offset-4 dark:hover:text-amber-400">{deck.name}</Link>
        <p className="mt-1 text-sm text-muted-foreground">{deck.format} · {deck.hero_name || deck.hero_class_name}</p>
        {showAuthor && deck.author_username ? <div className="mt-3 flex items-center justify-between gap-2"><Link to={`/players/${deck.author_username}`} className="inline-flex min-w-0 items-center gap-1.5 truncate text-sm text-muted-foreground transition-colors hover:text-foreground"><UserRound className="size-3.5 shrink-0" />{deck.author_name}</Link>{deck.community_copies > 1 ? <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground" title={`${deck.community_copies} players published this exact deck code`}><UsersRound className="size-3.5" />{deck.community_copies}</span> : null}</div> : null}
        {deck.tags.length > 0 ? <div className="mt-3 flex flex-wrap gap-1.5">{deck.tags.slice(0, 3).map((tag) => <Badge key={tag} variant="outline" className="text-muted-foreground">{tag}</Badge>)}</div> : <div className="mt-3 h-6" />}
        <div className="mt-4 flex gap-2">
          <Button size="sm" onClick={copyCode} className="bg-amber-600 text-white hover:bg-amber-500 dark:text-black"><Copy className="mr-1.5 size-3.5" />Copy code</Button>
          <Link to={`/public/decks/${deck.id}`} className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><Layers3 className="mr-1.5 size-3.5" />View</Link>
        </div>
      </div>
    </article>
  );
}
