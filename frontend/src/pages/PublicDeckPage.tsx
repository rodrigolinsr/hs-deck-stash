import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, Info, LibraryBig, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import CardTileRow from "@/components/deck/CardTileRow";
import ManaCurveChart from "@/components/deck/ManaCurveChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";
import { copyText } from "@/lib/clipboard";
import { classTheme } from "@/lib/hsclasses";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { DeckDetail, DeckSummary, PublicDeckDetail } from "@/lib/types";

export default function PublicDeckPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const deckQuery = useQuery<PublicDeckDetail>({
    queryKey: ["public-deck", deckId],
    queryFn: () => apiGet<PublicDeckDetail>(`/public/decks/${deckId}`),
    enabled: Boolean(deckId),
    retry: false,
  });
  const libraryQuery = useQuery<DeckSummary[]>({
    queryKey: ["decks"],
    queryFn: () => apiGet<DeckSummary[]>("/decks"),
    enabled: Boolean(user),
    retry: false,
  });
  const alreadySaved = useMemo(() => Boolean(deckQuery.data && libraryQuery.data?.some((deck) => deck.code === deckQuery.data?.code)), [deckQuery.data, libraryQuery.data]);
  const importDeck = useMutation({
    mutationFn: () => apiPost<DeckDetail>(`/public/decks/${deckId}/import`),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["decks"] });
      qc.invalidateQueries({ queryKey: ["hsreplay-stats"] });
      toast.success("Deck added to your library");
      navigate(`/decks/${saved.id}`);
    },
    onError: () => toast.error("Could not add this deck to your library"),
  });
  const deck = deckQuery.data;
  const theme = classTheme(deck?.hero_class ?? "NEUTRAL");

  return <AppShell user={user}>
    {deckQuery.isError ? <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-border bg-card p-8 text-center"><LibraryBig className="mx-auto size-8 text-muted-foreground" /><h1 className="mt-4 font-heading text-2xl font-semibold">This deck is no longer public</h1><p className="mt-2 text-sm text-muted-foreground">It may have been made private or removed by its owner.</p><Link to="/" className="mt-5 inline-block text-sm font-medium text-amber-600 hover:underline dark:text-amber-400">Browse your library</Link></div> : !deck ? <p className="mt-12 text-center text-sm text-muted-foreground">Loading public deck…</p> : <div className="mx-auto max-w-5xl"><section className="relative overflow-hidden rounded-2xl border p-6 text-white sm:p-8" style={{ borderColor: `${theme.color}55`, background: theme.bg }}><>{theme.image ? <img src={theme.image} alt="" className="absolute inset-0 size-full object-cover object-[center_30%] opacity-35" /> : null}<div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/25" /></><div className="relative"><p className="flex items-center gap-2 text-sm text-white/75"><UserRound className="size-4" />Published by {deck.author_name}</p><h1 className="mt-3 font-heading text-4xl font-semibold leading-tight">{deck.name}</h1><div className="mt-4 flex items-center gap-3" style={{ color: theme.color }}>{theme.icon ? <img src={theme.icon} alt="" className="size-10" /> : null}<p className="font-heading text-xl font-semibold">{deck.hero_class_name}<span className="ml-2 font-medium text-white/80">· {deck.format}</span></p></div>{deck.tags.length > 0 ? <div className="mt-5 flex flex-wrap gap-1.5">{deck.tags.map((tag) => <Badge key={tag} variant="outline" className="border-white/25 text-white/90" data-public-tag={tag}>{tag}</Badge>)}</div> : null}</div></section><div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]"><div className="space-y-3"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Decklist — click a card for full art</p><div className="space-y-1.5">{deck.cards.map((card, index) => <CardTileRow key={card.dbf_id} card={card} index={index} />)}</div></div><aside className="space-y-5"><div className="rounded-2xl border border-border bg-card p-5"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Use this deck</p><div className="mt-3 rounded-lg border border-border bg-muted px-3 py-2.5"><code className="block break-all font-mono text-[11px] leading-5 text-muted-foreground">{deck.code}</code></div><div className="mt-3 grid grid-cols-[auto_1fr] gap-2 rounded-lg bg-muted/60 p-3 text-xs leading-5 text-muted-foreground"><Info className="mt-0.5 size-3.5 text-amber-600 dark:text-amber-400" /><p>Copy this code, then open Hearthstone’s deck creation screen and choose <span className="font-medium text-foreground">Paste a deck code</span> to import it.</p></div><Button className="mt-4 w-full bg-amber-600 text-white hover:bg-amber-500 dark:text-black" onClick={async () => { const ok = await copyText(deck.code); toast[ok ? "success" : "error"](ok ? "Deck code copied" : "Could not copy the deck code"); }}><Copy className="mr-1.5 size-4" />Copy deck code</Button>{user ? alreadySaved ? <Link to="/" className="mt-3 block text-center text-sm font-medium text-muted-foreground hover:text-foreground">Already in your library</Link> : <Button variant="outline" className="mt-2 w-full" onClick={() => importDeck.mutate()} disabled={importDeck.isPending}>{importDeck.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Download className="mr-1.5 size-4" />}Add to my library</Button> : <Link to="/login" className="mt-3 block text-center text-sm font-medium text-amber-600 hover:underline dark:text-amber-400">Sign in to add this deck</Link>}</div><div className="rounded-2xl border border-border bg-card p-5"><ManaCurveChart cards={deck.cards} accent={theme.color} /></div>{deck.notes ? <div className="rounded-2xl border border-border bg-card p-5"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes from {deck.author_name}</p><p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{deck.notes}</p></div> : null}</aside></div></div>}
  </AppShell>;
}
