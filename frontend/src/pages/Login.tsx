import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ClipboardPaste, Copy, FolderHeart, Loader2, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import AppBrand from "@/components/AppBrand";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiPost } from "@/lib/api";
import { beginSession } from "@/lib/session";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { User } from "@/lib/types";

function WhyUseHSDeckStash({ testId, className = "" }: { testId: string; className?: string }) {
  return <section className={className} data-testid={testId} aria-labelledby={`${testId}-heading`}>
    <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-amber-700 dark:text-amber-400">Why use HSDeckStash?</p>
    <h2 id={`${testId}-heading`} className="mt-2 font-heading text-2xl font-semibold leading-tight">Save the decks worth coming back to.</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
      <div className="rounded-xl border border-border/80 bg-card/65 p-3.5 backdrop-blur-sm"><ClipboardPaste className="size-4 text-amber-600 dark:text-amber-400" /><p className="mt-2 text-sm font-semibold">Catch the code</p><p className="mt-1 text-xs leading-5 text-muted-foreground">A Twitch <span className="font-mono">!deck</span> response, a social post, or a full export—stash it in seconds, wherever you find it.</p></div>
      <div className="rounded-xl border border-border/80 bg-card/65 p-3.5 backdrop-blur-sm"><FolderHeart className="size-4 text-amber-600 dark:text-amber-400" /><p className="mt-2 text-sm font-semibold">Keep the context</p><p className="mt-1 text-xs leading-5 text-muted-foreground">File it by streamer, season, or archetype; use tags and notes for the details you would otherwise forget.</p></div>
      <div className="rounded-xl border border-border/80 bg-card/65 p-3.5 backdrop-blur-sm"><Copy className="size-4 text-amber-600 dark:text-amber-400" /><p className="mt-2 text-sm font-semibold">Play it later</p><p className="mt-1 text-xs leading-5 text-muted-foreground">When you are back in the game, find the deck, review its cards, and copy the code in one click.</p></div>
    </div>
  </section>;
}

export default function Login() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetRequestStatus, setResetRequestStatus] = useState<string | null>(null);

  function clearRegistrationError() {
    if (registrationError) setRegistrationError(null);
  }

  useEffect(() => {
    if (user) navigate("/library", { replace: true });
  }, [user, navigate]);

  const submit = useMutation({
    mutationFn: () => apiPost<User>(`/auth/${mode}`, {
      email: email.trim(), password, remember_me: rememberMe,
      ...(mode === "signup" ? { display_name: username.trim() } : {}),
    }),
    onSuccess: (result) => {
      setRegistrationError(null);
      beginSession();
      toast.success(`Welcome, ${result.display_name || result.email}`);
      navigate("/library", { replace: true });
    },
    onError: (err) => {
      let message = mode === "login" ? "Invalid email or password" : "Could not create account";
      if (err instanceof ApiError) {
        const body = err.body as { detail?: unknown } | null;
        if (typeof body?.detail === "string") message = body.detail;
        else if (err.status === 422) message = "Enter a username, a valid email, and a password of 6+ characters";
      }
      if (mode === "signup") setRegistrationError(message);
      else toast.error(message);
    },
  });
  const requestReset = useMutation({
    mutationFn: () => apiPost<{ ok: boolean }>("/auth/password-reset", { email: email.trim() }),
    onSuccess: () => setResetRequestStatus("If that email has an account, we sent a password reset link."),
    onError: () => setResetRequestStatus("We could not request a reset right now. Please try again."),
  });

  return (
    <div className="relative grid min-h-[100dvh] overflow-x-hidden bg-background text-foreground lg:grid-cols-[1.15fr_0.85fr]">
      <img src="/tavern.jpeg" alt="" className="absolute inset-0 size-full object-cover object-[58%_center] opacity-60 dark:opacity-40 lg:object-center lg:opacity-55 lg:dark:opacity-35" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/48 to-background/80 dark:from-background/90 dark:via-background/72 dark:to-background/90 lg:bg-gradient-to-r lg:from-background/75 lg:via-background/40 lg:to-background/75 lg:dark:from-background/90 lg:dark:via-background/75 lg:dark:to-background/90" />
      <div className="relative hidden min-h-[100dvh] flex-col justify-between p-10 lg:flex xl:p-14">
        <AppBrand className="h-16 xl:h-20" />
        <div className="max-w-2xl pb-2">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400">Your personal deck library</p>
          <h1 className="mt-4 font-heading text-5xl font-semibold leading-[1.03] xl:text-6xl">
            Never lose a great deck code.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
            A simple personal library for the decks you discover—save them, organise them, and bring them into Hearthstone whenever you are ready.
          </p>
          <WhyUseHSDeckStash testId="desktop-why-use" className="mt-8" />
        </div>
      </div>

      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10 sm:px-10 lg:min-h-screen lg:px-6 lg:py-12">
        <div className="fixed right-5 top-5 z-30 rounded-full border border-border bg-card/95 p-1 shadow-lg lg:right-8 lg:top-8"><ThemeToggle /></div>
        <div className="mb-7 w-full max-w-sm lg:hidden" data-testid="mobile-login-intro">
          <AppBrand className="h-11" />
          <p className="mt-7 font-mono text-[0.65rem] uppercase tracking-[0.24em] text-amber-700 dark:text-amber-400">Your personal deck library</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold leading-[1.08]">Never lose a great deck code.</h1>
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">Save a deck whenever you discover it, organise it your way, and play it when you are ready.</p>
        </div>
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card/90 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <h2 className="font-heading text-3xl font-semibold" data-testid="auth-heading">
            {forgotPassword ? "Reset your password" : mode === "login" ? "Welcome back" : "Create your library"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {forgotPassword ? "Enter your email and we’ll send you a reset link." : mode === "login" ? "Sign in to manage your saved decks." : "Use six or more characters for your password."}
          </p>

          <form className="mt-8 space-y-4" onSubmit={(event) => { event.preventDefault(); if (forgotPassword) requestReset.mutate(); else submit.mutate(); }} data-testid="auth-form">
            {forgotPassword ? <><div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setResetRequestStatus(null); }} placeholder="you@example.com" required data-testid="auth-email-input" />
            </div>
            {resetRequestStatus ? <p className="rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground" role="status">{resetRequestStatus}</p> : null}
            <Button type="submit" disabled={requestReset.isPending} className="w-full bg-amber-600 text-white hover:bg-amber-500 dark:text-black">{requestReset.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Send reset link</Button></> : <>
            {mode === "signup" ? <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" autoComplete="username" value={username} onChange={(event) => { setUsername(event.target.value); clearRegistrationError(); }} placeholder="Deckkeeper" required maxLength={80} aria-invalid={Boolean(registrationError)} aria-describedby={registrationError ? "registration-error" : undefined} data-testid="auth-username-input" />
            </div> : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); clearRegistrationError(); }} placeholder="you@example.com" aria-invalid={mode === "signup" && Boolean(registrationError)} aria-describedby={mode === "signup" && registrationError ? "registration-error" : undefined} data-testid="auth-email-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => { setPassword(event.target.value); clearRegistrationError(); }} placeholder="••••••••" aria-invalid={mode === "signup" && Boolean(registrationError)} aria-describedby={mode === "signup" && registrationError ? "registration-error" : undefined} data-testid="auth-password-input" />
            </div>
            {mode === "signup" && registrationError ? <p id="registration-error" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert" data-testid="registration-error">{registrationError}</p> : null}
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
              <Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} data-testid="remember-me-checkbox" />
              <span>Remember me for 30 days</span>
            </label>
            <Button type="submit" disabled={submit.isPending} className="w-full bg-amber-600 text-white hover:bg-amber-500 dark:text-black" data-testid="auth-submit-button">
              {submit.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>
            </>}
          </form>

          {forgotPassword ? <button type="button" onClick={() => { setForgotPassword(false); setResetRequestStatus(null); }} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-amber-600 dark:hover:text-amber-400"><LogIn className="size-4" />Back to sign in</button> : <>
            {mode === "login" ? <button type="button" onClick={() => setForgotPassword(true)} className="mt-4 text-sm font-medium text-amber-700 underline-offset-4 transition-colors hover:text-amber-600 hover:underline dark:text-amber-400 dark:hover:text-amber-300" data-testid="forgot-password-button">Forgot password?</button> : null}
            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
            <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setRegistrationError(null); }} className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300" data-testid="auth-mode-toggle">
              {mode === "login" ? <UserPlus className="size-4" /> : <LogIn className="size-4" />}
              {mode === "login" ? "Create an account" : "Sign in to your account"}
            </button>
          </>}
        </div>
        <WhyUseHSDeckStash testId="mobile-why-use" className="mt-8 w-full max-w-sm pb-3 lg:hidden" />
      </div>
    </div>
  );
}
