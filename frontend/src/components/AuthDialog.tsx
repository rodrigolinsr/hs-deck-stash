import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiPost } from "@/lib/api";
import { beginSession } from "@/lib/session";
import type { User } from "@/lib/types";

export default function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const submit = useMutation({
    mutationFn: () => apiPost<User>(`/auth/${mode}`, { email: email.trim(), password, remember_me: true, ...(mode === "signup" ? { display_name: displayName.trim() } : {}) }),
    onSuccess: (user) => { beginSession(); queryClient.setQueryData(["me"], user); onOpenChange(false); toast.success(`Welcome, ${user.display_name || user.email}`); navigate("/library"); },
    onError: (error) => {
      const detail = error instanceof ApiError && typeof (error.body as { detail?: unknown } | null)?.detail === "string" ? (error.body as { detail: string }).detail : null;
      toast.error(detail || (mode === "login" ? "Invalid email or password" : "Could not create your library"));
    },
  });
  return <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="font-heading text-2xl">{mode === "login" ? "Welcome back" : "Create your library"}</DialogTitle><DialogDescription>{mode === "login" ? "Sign in to save and manage your decks." : "Save deck codes and share your best lists."}</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); submit.mutate(); }}>{mode === "signup" ? <div className="space-y-2"><Label htmlFor="dialog-username">Username</Label><Input id="dialog-username" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={80} autoComplete="username" /></div> : null}<div className="space-y-2"><Label htmlFor="dialog-email">Email</Label><Input id="dialog-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></div><div className="space-y-2"><Label htmlFor="dialog-password">Password</Label><Input id="dialog-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} /></div><Button type="submit" disabled={submit.isPending} className="w-full bg-amber-600 text-white hover:bg-amber-500 dark:text-black">{submit.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : mode === "login" ? <LogIn className="mr-2 size-4" /> : <UserPlus className="mr-2 size-4" />}{mode === "login" ? "Sign in" : "Create account"}</Button></form><button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="mx-auto block text-sm text-amber-700 hover:underline dark:text-amber-400">{mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}</button></DialogContent></Dialog>;
}
