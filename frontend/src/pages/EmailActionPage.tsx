import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import AppBrand from "@/components/AppBrand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiPost } from "@/lib/api";

function AuthFrame({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-5 py-10"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-xl"><AppBrand className="h-10" />{children}</div></div>;
}

function errorMessage(error: unknown, fallback: string) {
  const body = error instanceof ApiError ? error.body as { detail?: unknown } : null;
  return typeof body?.detail === "string" ? body.detail : fallback;
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Confirming your email…");
  const token = params.get("token");

  useEffect(() => {
    if (!token) { setState("error"); setMessage("This verification link is incomplete."); return; }
    apiPost("/auth/verify-email", { token }).then(() => { setState("success"); setMessage("Your email is verified. You’re all set."); }).catch((error) => { setState("error"); setMessage(errorMessage(error, "We could not verify this email link.")); });
  }, [token]);

  return <AuthFrame><h1 className="mt-8 font-heading text-3xl font-semibold">Verify your email</h1><p className={`mt-4 flex items-center gap-2 text-sm ${state === "success" ? "text-emerald-600 dark:text-emerald-400" : state === "error" ? "text-destructive" : "text-muted-foreground"}`}>{state === "loading" ? <Loader2 className="size-4 animate-spin" /> : state === "success" ? <CheckCircle2 className="size-4" /> : null}{message}</p><Link to="/login" className="mt-7 flex w-full items-center justify-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 dark:text-black">Go to sign in</Link></AuthFrame>;
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const token = params.get("token");

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(null);
    if (!token) { setError("This password reset link is incomplete."); return; }
    setPending(true);
    try { await apiPost("/auth/password-reset/confirm", { token, new_password: password }); setStatus("Password updated. You can now sign in."); }
    catch (requestError) { setError(errorMessage(requestError, "We could not reset your password.")); }
    finally { setPending(false); }
  }

  return <AuthFrame><h1 className="mt-8 font-heading text-3xl font-semibold">Set a new password</h1>{status ? <><p className="mt-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-4" />{status}</p><Link to="/login" className="mt-7 flex w-full items-center justify-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 dark:text-black">Sign in</Link></> : <form className="mt-6 space-y-4" onSubmit={submit}><div className="space-y-2"><Label htmlFor="reset-password">New password</Label><Input id="reset-password" type="password" minLength={6} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>{error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}<Button type="submit" disabled={pending} className="w-full bg-amber-600 text-white hover:bg-amber-500 dark:text-black">{pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Update password</Button></form>}<Link to="/login" className="mt-6 block text-sm text-muted-foreground hover:text-amber-600">Back to sign in</Link></AuthFrame>;
}
