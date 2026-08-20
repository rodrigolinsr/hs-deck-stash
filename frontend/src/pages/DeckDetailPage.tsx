import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import CardTileRow from "@/components/deck/CardTileRow";
import DeckImportDialog from "@/components/deck/DeckImportDialog";
import DeleteDeckDialog from "@/components/deck/DeleteDeckDialog";
import ManaCurveChart from "@/components/deck/ManaCurveChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiDelete, apiGet } from "@/lib/api";
import { copyText } from "@/lib/clipboard";
import { classTheme } from "@/lib/hsclasses";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { DeckDetail, DeleteResult } from "@/lib/types";

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

  const remove = useMutation({
    mutationFn: () => apiDelete<DeleteResult>(`/decks/${deckId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decks"] });
      setDeleteOpen(false);
      toast.success("Deck deleted");
      navigate("/", { replace: true });
    },
    onError: () => toast.error("Could not delete that deck"),
  });

  const deck = deckQuery.data;
  const theme = classTheme(deck?.hero_class ?? "NEUTRAL");

  return (
    <AppShell user={user}>
      <Link
        to="/"
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

            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Deck code
              </p>
              <p
                className="break-all rounded-lg bg-muted p-3 font-mono text-[11px] text-muted-foreground"
                data-testid="deck-detail-code"
              >
                {deck.code}
              </p>
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
