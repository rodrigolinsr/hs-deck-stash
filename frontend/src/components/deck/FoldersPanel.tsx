import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Folder, FolderOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ApiError, apiDelete, apiPatch, apiPost } from "@/lib/api";
import type { DeckSummary, Folder as DeckFolder, FolderDeleteResult } from "@/lib/types";

export type FolderFilter = "all" | "unfiled" | string;

interface FoldersPanelProps {
  folders: DeckFolder[];
  decks: DeckSummary[];
  activeFolder: FolderFilter;
  onChange: (folder: FolderFilter) => void;
}

function errorMessage(error: unknown, fallback: string) {
  const body = error instanceof ApiError ? error.body as { detail?: unknown } : null;
  return typeof body?.detail === "string" ? body.detail : fallback;
}

export default function FoldersPanel({ folders, decks, activeFolder, onChange }: FoldersPanelProps) {
  const qc = useQueryClient();
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleting, setDeleting] = useState<DeckFolder | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["folders"] });
    qc.invalidateQueries({ queryKey: ["decks"] });
  };
  const create = useMutation({
    mutationFn: () => apiPost<DeckFolder>("/folders", { name: newName }),
    onSuccess: (folder) => { refresh(); setNewName(""); setNewFolderOpen(false); onChange(folder.id); toast.success(`Created “${folder.name}”`); },
    onError: (error) => toast.error(errorMessage(error, "Could not create folder")),
  });
  const rename = useMutation({
    mutationFn: (folder: DeckFolder) => apiPatch<DeckFolder>(`/folders/${folder.id}`, { name: editingName }),
    onSuccess: () => { refresh(); setEditingId(null); toast.success("Folder renamed"); },
    onError: (error) => toast.error(errorMessage(error, "Could not rename folder")),
  });
  const remove = useMutation({
    mutationFn: (folder: DeckFolder) => apiDelete<FolderDeleteResult>(`/folders/${folder.id}`),
    onSuccess: (result, folder) => {
      refresh();
      if (activeFolder === folder.id) onChange("unfiled");
      setDeleting(null);
      toast.success(result.unfoldered_decks ? `Folder deleted — ${result.unfoldered_decks} deck${result.unfoldered_decks === 1 ? "" : "s"} moved to Unfiled` : "Folder deleted");
    },
    onError: (error) => toast.error(errorMessage(error, "Could not delete folder")),
  });

  const folderCount = (folderId: string | null) => decks.filter((deck) => deck.folder_id === folderId).length;
  const rowClass = (active: boolean) => `group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${active ? "bg-amber-500/15 font-medium text-amber-700 dark:text-amber-300" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;

  return <aside className="rounded-2xl border border-border bg-card p-3 shadow-sm lg:sticky lg:top-6 lg:h-fit" aria-label="Deck folders">
    <div className="mb-2 flex items-center justify-between px-2">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Folders</p>
      <Button type="button" variant="ghost" size="icon-xs" onClick={() => setNewFolderOpen(true)} aria-label="Create folder" title="Create folder" data-testid="create-folder-button"><Plus className="size-4" /></Button>
    </div>
    <div className="space-y-0.5">
      <button type="button" className={rowClass(activeFolder === "all")} onClick={() => onChange("all")}><FolderOpen className="size-4" />All decks <span className="ml-auto font-mono text-xs opacity-70">{decks.length}</span></button>
      <button type="button" className={rowClass(activeFolder === "unfiled")} onClick={() => onChange("unfiled")}><Folder className="size-4" />Unfiled <span className="ml-auto font-mono text-xs opacity-70">{folderCount(null)}</span></button>
      {folders.length ? <div className="my-2 border-t border-border" /> : null}
      {folders.map((folder) => <div key={folder.id} className={rowClass(activeFolder === folder.id)}>
        {editingId === folder.id ? <>
          <Input aria-label={`Rename ${folder.name}`} value={editingName} onChange={(event) => setEditingName(event.target.value)} className="h-7 min-w-0 flex-1 bg-background text-xs" autoFocus onKeyDown={(event) => { if (event.key === "Enter" && editingName.trim()) rename.mutate(folder); if (event.key === "Escape") setEditingId(null); }} />
          <Button type="button" size="icon-xs" variant="ghost" onClick={() => editingName.trim() && rename.mutate(folder)} disabled={rename.isPending} aria-label="Save folder name"><Check className="size-3.5" /></Button>
          <Button type="button" size="icon-xs" variant="ghost" onClick={() => setEditingId(null)} aria-label="Cancel rename"><X className="size-3.5" /></Button>
        </> : <>
          <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => onChange(folder.id)}><Folder className="size-4 shrink-0" /><span className="truncate">{folder.name}</span><span className="ml-auto font-mono text-xs opacity-70">{folderCount(folder.id)}</span></button>
          <div className="flex shrink-0 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
            <Button type="button" size="icon-xs" variant="ghost" onClick={() => { setEditingId(folder.id); setEditingName(folder.name); }} aria-label={`Rename ${folder.name}`}><Pencil className="size-3.5" /></Button>
            <Button type="button" size="icon-xs" variant="ghost" onClick={() => setDeleting(folder)} aria-label={`Delete ${folder.name}`}><Trash2 className="size-3.5" /></Button>
          </div>
        </>}
      </div>)}
      <Button type="button" variant="outline" className="mt-3 w-full justify-start border-dashed text-muted-foreground hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300" onClick={() => setNewFolderOpen(true)} data-testid="create-folder-bottom-button"><Plus className="mr-2 size-4" />Create folder</Button>
    </div>

    <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
      <DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Create a folder</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Try a season, streamer, archetype, or any grouping that helps you find decks faster.</p><Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="e.g. Legend climb" autoFocus onKeyDown={(event) => { if (event.key === "Enter" && newName.trim()) create.mutate(); }} /><DialogFooter><Button type="button" variant="ghost" onClick={() => setNewFolderOpen(false)}>Cancel</Button><Button type="button" onClick={() => create.mutate()} disabled={!newName.trim() || create.isPending} className="bg-amber-600 text-white hover:bg-amber-500 dark:text-black">{create.isPending ? "Creating…" : "Create folder"}</Button></DialogFooter></DialogContent>
    </Dialog>
    <Dialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
      <DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Delete “{deleting?.name}”?</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Its decks will be kept safely and moved to Unfiled.</p><DialogFooter><Button type="button" variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button><Button type="button" variant="destructive" onClick={() => deleting && remove.mutate(deleting)} disabled={remove.isPending}>{remove.isPending ? "Deleting…" : "Delete folder"}</Button></DialogFooter></DialogContent>
    </Dialog>
  </aside>;
}
