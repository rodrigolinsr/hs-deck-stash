import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteDeckDialogProps {
  open: boolean;
  deckName?: string;
  isDeleting?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function DeleteDeckDialog({ open, deckName, isDeleting, onOpenChange, onConfirm }: DeleteDeckDialogProps) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="border-red-500/25 bg-popover sm:max-w-md" data-testid="delete-deck-dialog">
      <DialogHeader>
        <div className="flex size-10 items-center justify-center rounded-full bg-red-500/10 text-red-500"><AlertTriangle className="size-5" /></div>
        <DialogTitle className="pt-2 font-heading text-2xl">Delete this deck?</DialogTitle>
      </DialogHeader>
      <p className="text-sm leading-6 text-muted-foreground">This permanently removes <span className="font-medium text-foreground">{deckName || "this deck"}</span> from your library. This action cannot be undone.</p>
      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>Keep deck</Button>
        <Button variant="destructive" onClick={onConfirm} disabled={isDeleting} data-testid="confirm-delete-deck-button">{isDeleting ? "Deleting…" : "Delete deck"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
