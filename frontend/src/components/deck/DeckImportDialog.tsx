import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger } from "@/components/ui/select";
import { ApiError, apiPatch, apiPost } from "@/lib/api";
import { classTheme } from "@/lib/hsclasses";
import { parseDeckClipboard, type ParsedDeckClipboard } from "@/lib/deckClipboard";
import type { DeckDetail, DeckPreview, DeckSummary, Folder } from "@/lib/types";

interface DeckImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck?: DeckSummary | DeckDetail | null;
  folders?: Folder[];
  initialFolderId?: string | null;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const body = err.body as { detail?: unknown } | null;
    if (typeof body?.detail === "string") return body.detail;
  }
  return fallback;
}

export default function DeckImportDialog({ open, onOpenChange, deck, folders = [], initialFolderId = null }: DeckImportDialogProps) {
  const qc = useQueryClient();
  const isEdit = Boolean(deck);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [folderId, setFolderId] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [clipboardDeck, setClipboardDeck] = useState<ParsedDeckClipboard | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(deck?.name ?? "");
    setCode(deck?.code ?? "");
    setNotes(deck?.notes ?? "");
    setTags((deck?.tags ?? []).join(", "));
    setFolderId(deck?.folder_id ?? initialFolderId ?? "");
    setNewFolderName("");
    setCreatingFolder(false);
    setClipboardDeck(null);
  }, [open, deck]);

  const trimmed = code.trim();
  const codeToPreview = clipboardDeck?.code ?? trimmed;
  const preview = useQuery<DeckPreview>({
    queryKey: ["deck-preview", codeToPreview],
    queryFn: () => apiPost<DeckPreview>("/decks/preview", { code: codeToPreview }),
    enabled: open && codeToPreview.length > 20,
    retry: false,
  });

  const save = useMutation({
    mutationFn: async () => {
      let resolvedFolderId = folderId || null;
      if (creatingFolder && newFolderName.trim()) {
        const folder = await apiPost<Folder>("/folders", { name: newFolderName.trim() });
        resolvedFolderId = folder.id;
      }
      const payload = {
        name: name.trim(),
        code: trimmed,
        notes: notes.trim(),
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        folder_id: resolvedFolderId,
      };
      if (deck) return apiPatch<DeckDetail>(`/decks/${deck.id}`, payload);
      return apiPost<DeckDetail>("/decks", payload);
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["decks"] });
      qc.invalidateQueries({ queryKey: ["folders"] });
      qc.invalidateQueries({ queryKey: ["deck", saved.id] });
      toast.success(isEdit ? "Deck updated" : `Saved "${saved.name}"`);
      onOpenChange(false);
    },
    onError: (err) => toast.error(errorMessage(err, "Could not save the deck")),
  });

  const decodeError = preview.isError
    ? errorMessage(preview.error, "That deck code could not be decoded")
    : null;
  const data = preview.data;
  const theme = classTheme(data?.hero_class ?? "NEUTRAL");
  const duplicate = data?.duplicate_of_id && data.duplicate_of_id !== deck?.id;
  const selectedFolderName = creatingFolder ? "New folder" : folders.find((folder) => folder.id === folderId)?.name ?? "Unfiled";

  function acceptClipboardDeck() {
    if (!clipboardDeck) return;
    setCode(clipboardDeck.code);
    if (!name.trim() && clipboardDeck.name) setName(clipboardDeck.name);
    setClipboardDeck(null);
  }

  function handleDeckCodePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const parsed = parseDeckClipboard(event.clipboardData.getData("text"));
    if (!parsed) return;
    event.preventDefault();
    if (parsed.isAnnotated) {
      setClipboardDeck(parsed);
      return;
    }
    setClipboardDeck(null);
    setCode(parsed.code);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] min-w-0 overflow-x-hidden overflow-y-auto border-amber-500/20 bg-popover sm:max-w-lg"
        data-testid="deck-import-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            {isEdit ? "Edit deck" : "Import a deck code"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deck-code">Deck code</Label>
            <Textarea
              id="deck-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onPaste={handleDeckCodePaste}
              rows={4}
              placeholder="AAECAfHhBAyV5ATDgweRqwfSrgeosQfQvwfqyQf2..."
              className="min-w-0 max-w-full resize-y break-all font-mono text-xs"
              data-testid="deck-code-input"
            />
            {preview.isFetching ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Decoding…
              </p>
            ) : null}
            {decodeError ? (
              <p className="text-xs text-red-400" data-testid="deck-decode-error">
                {decodeError}
              </p>
            ) : null}
          </div>

          {data ? (
            <div
              className="rounded-xl border p-4"
              style={{ borderColor: `${theme.color}44`, background: theme.bg }}
              data-testid="deck-decode-summary"
            >
              <p className="flex items-center gap-2 font-heading text-lg" style={{ color: theme.color }}>
                <Sparkles className="size-4" />
                {data.hero_class_name}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {data.format} · {data.card_count} cards · {data.dust_cost} dust · hero:{" "}
                {data.hero_name}
              </p>
              {duplicate ? (
                <p
                  className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-300"
                  data-testid="duplicate-deck-warning"
                >
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  You already saved this exact code as “{data.duplicate_of_name}”. Saving again
                  creates a second copy.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="deck-name">Deck name</Label>
            <Input
              id="deck-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={data ? `${data.hero_class_name} ${data.format}` : "My deck"}
              data-testid="deck-name-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deck-tags">Tags (comma separated)</Label>
            <Input
              id="deck-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Aggro, Legend Climb"
              data-testid="deck-tags-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deck-folder">Folder</Label>
            <Select value={creatingFolder ? "__create_folder__" : folderId} onValueChange={(value) => {
              if (value === "__create_folder__") { setCreatingFolder(true); return; }
              setCreatingFolder(false); setFolderId(value);
            }}>
              <SelectTrigger id="deck-folder" className="w-full" data-testid="deck-folder-select">{selectedFolderName}</SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unfiled</SelectItem>
                {folders.map((folder) => <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>)}
                <SelectSeparator />
                <SelectItem value="__create_folder__"><Plus className="size-4 text-amber-600 dark:text-amber-400" />Create a new folder…</SelectItem>
              </SelectContent>
            </Select>
            {creatingFolder ? <Input
              id="new-deck-folder"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="New folder name"
              maxLength={60}
              autoFocus
              data-testid="new-deck-folder-input"
            /> : null}
            <p className="text-xs text-muted-foreground">Choose an existing folder or create one without leaving this form.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deck-notes">Notes</Label>
            <Textarea
              id="deck-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Mulligan plan, tech choices…"
              data-testid="deck-notes-input"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            data-testid="deck-dialog-cancel-button"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!name.trim()) {
                toast.error("Give the deck a name first");
                return;
              }
              save.mutate();
            }}
            disabled={save.isPending || trimmed.length < 8 || (creatingFolder && !newFolderName.trim())}
            className="bg-amber-600 text-black transition-all duration-150 hover:bg-amber-500 active:scale-[0.98]"
            data-testid="deck-dialog-save-button"
          >
            {save.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {isEdit ? "Save changes" : "Save deck"}
          </Button>
        </DialogFooter>
        {clipboardDeck ? <div className="absolute inset-0 z-20 flex items-center bg-popover/95 p-5 backdrop-blur-sm" data-testid="clipboard-deck-confirmation">
          <div className="w-full rounded-2xl border border-amber-500/35 bg-card p-6 shadow-xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">Deck found in clipboard</p>
            <h3 className="mt-2 font-heading text-2xl font-semibold">{clipboardDeck.name || "Ready to import this deck?"}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{data ? `${data.hero_class_name} · ${data.format} · ${data.card_count} cards · ${data.dust_cost} dust` : [clipboardDeck.className, clipboardDeck.format].filter(Boolean).join(" · ") || "Checking the deck code"}</p>
            {preview.isFetching ? <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Decoding your deck…</p> : null}
            {decodeError ? <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">{decodeError}</p> : null}
            <p className="mt-5 text-sm text-muted-foreground">Confirm to prefill the deck name and code. You can then add tags and notes before saving.</p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" onClick={() => setClipboardDeck(null)}>Paste a different code</Button><Button onClick={acceptClipboardDeck} disabled={preview.isFetching || Boolean(decodeError)} className="bg-amber-600 text-white hover:bg-amber-500 dark:text-black" data-testid="clipboard-deck-confirm-button">Use this deck</Button></div>
          </div>
        </div> : null}
      </DialogContent>
    </Dialog>
  );
}
