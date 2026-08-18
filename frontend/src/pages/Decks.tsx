import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LibraryBig, Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import ClassFilterBar from "@/components/deck/ClassFilterBar";
import DeckCard from "@/components/deck/DeckCard";
import DeckImportDialog from "@/components/deck/DeckImportDialog";
import DeleteDeckDialog from "@/components/deck/DeleteDeckDialog";
import FoldersPanel, { type FolderFilter } from "@/components/deck/FoldersPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiDelete, apiGet } from "@/lib/api";
import { copyText } from "@/lib/clipboard";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { DeckSummary, DeleteResult, Folder } from "@/lib/types";

export default function Decks() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, isLoading: userLoading } = useCurrentUser();
  const [importOpen, setImportOpen] = useState(false);
  const [activeClass, setActiveClass] = useState("ALL");
  const [activeFolder, setActiveFolder] = useState<FolderFilter>("all");
  const [search, setSearch] = useState("");
  const [editingDeck, setEditingDeck] = useState<DeckSummary | null>(null);
  const [deletingDeck, setDeletingDeck] = useState<DeckSummary | null>(null);

  useEffect(() => {
    if (!userLoading && !user) navigate("/login", { replace: true });
  }, [user, userLoading, navigate]);

  const decksQuery = useQuery<DeckSummary[]>({
    queryKey: ["decks"],
    queryFn: () => apiGet<DeckSummary[]>("/decks"),
    enabled: Boolean(user),
    retry: false,
  });
  const foldersQuery = useQuery<Folder[]>({
    queryKey: ["folders"],
    queryFn: () => apiGet<Folder[]>("/folders"),
    enabled: Boolean(user),
    retry: false,
  });

  const remove = useMutation({
    mutationFn: (deck: DeckSummary) => apiDelete<DeleteResult>(`/decks/${deck.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decks"] });
      setDeletingDeck(null);
      toast.success("Deck deleted");
    },
    onError: () => toast.error("Could not delete that deck"),
  });

  const decks = decksQuery.data ?? [];
  const folderDecks = useMemo(() => decks.filter((deck) => (
    activeFolder === "all" || (activeFolder === "unfiled" ? !deck.folder_id : deck.folder_id === activeFolder)
  )), [decks, activeFolder]);
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const deck of folderDecks) map[deck.hero_class] = (map[deck.hero_class] ?? 0) + 1;
    return map;
  }, [folderDecks]);

  const visible = folderDecks.filter((deck) => {
    const matchesClass = activeClass === "ALL" || deck.hero_class === activeClass;
    const needle = search.trim().toLowerCase();
    const matchesSearch =
      !needle ||
      deck.name.toLowerCase().includes(needle) ||
      deck.hero_class_name.toLowerCase().includes(needle) ||
      deck.tags.some((t) => t.toLowerCase().includes(needle)) ||
      deck.notes.toLowerCase().includes(needle);
    return matchesClass && matchesSearch;
  });

  function handleFolderChange(folder: FolderFilter) {
    setActiveFolder(folder);
    setActiveClass("ALL");
  }

  async function handleCopy(deck: DeckSummary) {
    const ok = await copyText(deck.code);
    if (ok) toast.success(`Copied “${deck.name}” — paste it in Hearthstone`);
    else toast.error("Copy failed — select the code manually");
  }

  return (
    <AppShell user={user}>
      <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400"><LibraryBig className="size-5" /></span><div><p className="font-heading text-2xl font-semibold">Your deck library</p><p className="mt-0.5 text-sm text-muted-foreground">{decks.length} {decks.length === 1 ? "deck" : "decks"} stashed · paste a code to add another.</p></div></div>
        <Button onClick={() => setImportOpen(true)} className="bg-amber-600 text-white hover:bg-amber-500 dark:text-black" data-testid="import-deck-button"><Plus className="mr-1.5 size-4" />Import deck</Button>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <FoldersPanel folders={foldersQuery.data ?? []} decks={decks} activeFolder={activeFolder} onChange={handleFolderChange} />
        <div>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <ClassFilterBar counts={counts} active={activeClass} onChange={setActiveClass} />
            <div className="relative lg:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search decks, tags, notes…"
                className="pl-9"
                data-testid="deck-search-input"
              />
            </div>
          </div>

          <div className="mt-8">
            {decksQuery.isError ? (
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Deck list unavailable right now. Try again in a moment.
          </p>
        ) : visible.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed border-border bg-card/70 p-14 text-center"
            data-testid="decks-empty-state"
          >
            <Sparkles className="mx-auto size-8 text-amber-500/70" />
            <p className="mt-4 font-heading text-xl">
              {decks.length === 0 ? "No decks stashed yet" : "Nothing matches that filter"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {decks.length === 0
                ? "Copy a deck from Hearthstone and paste the code here."
                : "Try another class or clear the search."}
            </p>
          </div>
            ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" data-testid="deck-grid">
            {visible.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onCopy={handleCopy}
                onEdit={(d) => { setEditingDeck(d); setImportOpen(true); }}
                onDelete={setDeletingDeck}
              />
            ))}
          </div>
            )}
          </div>
        </div>
      </div>

      <DeckImportDialog open={importOpen} onOpenChange={(isOpen) => { setImportOpen(isOpen); if (!isOpen) setEditingDeck(null); }} deck={editingDeck} folders={foldersQuery.data ?? []} initialFolderId={activeFolder !== "all" && activeFolder !== "unfiled" ? activeFolder : null} />
      <DeleteDeckDialog open={Boolean(deletingDeck)} deckName={deletingDeck?.name} isDeleting={remove.isPending} onOpenChange={(isOpen) => { if (!isOpen) setDeletingDeck(null); }} onConfirm={() => { if (deletingDeck) remove.mutate(deletingDeck); }} />
    </AppShell>
  );
}
