import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, Copy, ExternalLink, Globe2, Info, Link2, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import CardTileRow from "@/components/deck/CardTileRow";
import DeckImportDialog from "@/components/deck/DeckImportDialog";
import DeleteDeckDialog from "@/components/deck/DeleteDeckDialog";
import ManaCurveChart from "@/components/deck/ManaCurveChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { copyText } from "@/lib/clipboard";
import { classTheme } from "@/lib/hsclasses";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { DeckDetail, DeleteResult, HsReplayStatsResponse } from "@/lib/types";

export default function DeckDetailPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) navigate("/login", { replace: true });
  }, [user, userLoading, navigate]);

  const deckQuery = useQuery<DeckDetail>({
    queryKey: ["deck", deckId],
    queryFn: () => apiGet<DeckDetail>(`/decks/${deckId}`),
    enabled: Boolean(user && deckId),
    retry: false,
  });
  const hsReplayQuery = useQuery<HsReplayStatsResponse>({
    queryKey: ["hsreplay-stats"],
    queryFn: () => apiGet<HsReplayStatsResponse>("/decks/hsreplay-stats"),
    enabled: Boolean(user && deckId),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  const remove = useMutation({
    mutationFn: () => apiDelete<DeleteResult>(`/decks/${deckId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decks"] });
      setDeleteOpen(false);
      toast.success("Deck deleted");
      navigate("/library", { replace: true });
    },
    onError: () => toast.error("Could not delete that deck"),
  });
  const visibility = useMutation({
    mutationFn: (action: "publish" | "unpublish") => apiPost<DeckDetail>(`/decks/${deckId}/${action}`),
    onSuccess: async (saved, action) => {
      qc.setQueryData(["deck", saved.id], saved);
      qc.invalidateQueries({ queryKey: ["decks"] });
      if (action === "publish") {
        const ok = await copyText(`${window.location.origin}/public/decks/${saved.id}`);
        toast.success(ok ? "Deck published — public link copied" : "Deck published — copy the public link from this page");
      } else {
        toast.success("Deck is private again");
      }
    },
    onError: () => toast.error("Could not update deck visibility"),
  });

  const deck = deckQuery.data;
  const hsReplayStat = hsReplayQuery.data?.stats.find((stat) => stat.deck_id === deckId);
  const theme = classTheme(deck?.hero_class ?? "NEUTRAL");

  return (
    <AppShell user={user}>
      <Link
        to="/library"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-amber-600 dark:hover:text-amber-400"
        data-testid="back-to-decks-link"
      >
        <ArrowLeft className="size-4" />
        All decks
      </Link>

      {deckQuery.isError ? (
        <p
          className="mt-8 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground"
          data-testid="deck-detail-error"
        >
          This deck could not be loaded. It may have been deleted.
        </p>
      ) : !deck ? (
        <p className="mt-8 text-sm text-muted-foreground" data-testid="deck-detail-loading">
          Loading deck…
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-4">
            <div
              className="relative overflow-hidden rounded-2xl border p-6 text-white"
              style={{ borderColor: `${theme.color}44`, background: theme.bg }}
            >
              {theme.image ? <img src={theme.image} alt="" className="absolute inset-0 size-full object-cover object-[center_30%] opacity-35" /> : null}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
              <div
                className="absolute inset-x-0 top-0 z-10 h-[3px]"
                style={{ background: `linear-gradient(90deg, ${theme.color}, transparent)` }}
              />
              <div className="relative">
              <h1
                className="font-heading text-3xl font-semibold leading-tight"
                data-testid="deck-detail-name"
              >
                {deck.name}
              </h1>
              <div className="mt-3 flex items-center gap-3" style={{ color: theme.color }}>
                {theme.icon ? <img src={theme.icon} alt={`${deck.hero_class_name} icon`} className="size-11" /> : null}
                <p className="font-heading text-2xl font-semibold leading-none">{deck.hero_class_name}<span className="ml-2 text-lg font-medium text-white/85">· {deck.format}</span></p>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                  <dt className="text-white/65">Cards</dt>
                  <dd className="mt-1 text-base text-white" data-testid="deck-detail-card-count">
                    {deck.card_count}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/25 p-3">
                  <dt className="text-white/65">Dust</dt>
                  <dd className="mt-1 text-base text-white" data-testid="deck-detail-dust">
                    {deck.dust_cost}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-white/70">Hero: {deck.hero_name}</p>

              {deck.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {deck.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-white/25 text-white/90">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              </div>
            </div>

            {hsReplayQuery.isLoading ? <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading HSReplay statistics…</div> : hsReplayStat ? <a href={`https://hsreplay.net/decks/${hsReplayStat.hsreplay_deck_id}/#gameType=${hsReplayStat.game_type}`} target="_blank" rel="noreferrer" className="block rounded-2xl border border-sky-500/25 bg-sky-500/5 p-6 transition-colors hover:bg-sky-500/10" data-testid="deck-detail-hsreplay-stats"><div className="flex items-center justify-between"><div><p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-sky-700 dark:text-sky-300"><BarChart3 className="size-3.5" />HSReplay · Bronze–Gold · last 30 days</p><p className="mt-3 font-heading text-2xl font-semibold">{hsReplayStat.win_rate.toFixed(2)}% <span className="text-base font-medium text-muted-foreground">win rate</span></p><p className="mt-1 text-sm text-muted-foreground">{hsReplayStat.total_games.toLocaleString()} recorded games</p></div><ExternalLink className="size-4 text-muted-foreground" aria-label="View this deck on HSReplay" /></div></a> : null}

            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Deck code
              </p>
              <div className="rounded-lg border border-border bg-muted px-3 py-2.5" data-testid="deck-detail-code">
                <code className="block break-all font-mono text-[11px] leading-5 text-muted-foreground">{deck.code}</code>
              </div>
              <div className="mt-3 grid grid-cols-[auto_1fr] gap-2 rounded-lg bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
                <Info className="mt-0.5 size-3.5 text-amber-600 dark:text-amber-400" />
                <p>Copy this code, then open Hearthstone’s deck creation screen and choose <span className="font-medium text-foreground">Paste a deck code</span> to import it.</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    const ok = await copyText(deck.code);
                    if (ok) toast.success("Deck code copied — paste it in Hearthstone");
                    else toast.error("Copy failed — select the code manually");
                  }}
                  className="bg-amber-600 text-black transition-all duration-150 hover:bg-amber-500 active:scale-[0.98]"
                  data-testid="deck-detail-copy-button"
                >
                  <Copy className="mr-1.5 size-3.5" />
                  Copy code
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditOpen(true)}
                  className="border-border"
                  data-testid="deck-detail-edit-button"
                >
                  <Pencil className="mr-1.5 size-3.5" />
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  if (deck.is_public) {
                    copyText(`${window.location.origin}/public/decks/${deck.id}`).then((ok) => toast[ok ? "success" : "error"](ok ? "Public link copied" : "Could not copy the public link"));
                  } else {
                    visibility.mutate("publish");
                  }
                }} disabled={visibility.isPending} data-testid="deck-share-button">
                  {visibility.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : deck.is_public ? <Link2 className="mr-1.5 size-3.5" /> : <Globe2 className="mr-1.5 size-3.5" />}
                  {deck.is_public ? "Copy public link" : "Share deck"}
                </Button>
                {deck.is_public ? <Button size="sm" variant="ghost" onClick={() => visibility.mutate("unpublish")} disabled={visibility.isPending} className="text-muted-foreground" data-testid="deck-unpublish-button">Make private</Button> : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteOpen(true)}
                  className="text-muted-foreground hover:text-red-500"
                  data-testid="deck-detail-delete-button"
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  Delete
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <ManaCurveChart cards={deck.cards} accent={theme.color} />
            </div>

            {deck.notes ? (
              <div className="rounded-2xl border border-border bg-card p-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Notes
                </p>
                <p
                  className="whitespace-pre-wrap text-sm text-muted-foreground"
                  data-testid="deck-detail-notes"
                >
                  {deck.notes}
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 lg:col-span-8">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Decklist — click a card for full art
            </p>
            <div className="space-y-1.5" data-testid="deck-card-list">
              {deck.cards.map((card, index) => (
                <CardTileRow key={card.dbf_id} card={card} index={index} />
              ))}
            </div>
          </div>
        </div>
      )}

      <DeckImportDialog open={editOpen} onOpenChange={setEditOpen} deck={deck ?? null} />
      <DeleteDeckDialog open={deleteOpen} deckName={deck?.name} isDeleting={remove.isPending} onOpenChange={setDeleteOpen} onConfirm={() => remove.mutate()} />
    </AppShell>
  );
}
