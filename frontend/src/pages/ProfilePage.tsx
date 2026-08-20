import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, KeyRound, MailCheck, ShieldAlert, UserRound } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiPatch, apiPost } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { User } from "@/lib/types";

function message(error: unknown, fallback: string) {
  const body = error instanceof ApiError ? error.body as { detail?: unknown } : null;
  return typeof body?.detail === "string" ? body.detail : fallback;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading } = useCurrentUser();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileSaveStatus, setProfileSaveStatus] = useState<string | null>(null);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [passwordSaveStatus, setPasswordSaveStatus] = useState<string | null>(null);
  const [passwordSaveError, setPasswordSaveError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  useEffect(() => { if (!isLoading && !user) navigate("/login", { replace: true }); }, [isLoading, user, navigate]);
  useEffect(() => { if (user) { setDisplayName(user.display_name); setEmail(user.email); } }, [user]);

  const profileUpdate = useMutation({
    mutationFn: () => apiPatch<User>("/auth/profile", { display_name: displayName.trim(), email: email.trim() }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      setProfileSaveStatus("Saved. Your username is now shown in the navigation.");
      setProfileSaveError(null);
      toast.success("Profile saved");
    },
    onError: (error) => {
      const errorMessage = message(error, "Could not save your profile");
      setProfileSaveError(errorMessage);
      toast.error(errorMessage);
    },
  });
  const passwordUpdate = useMutation({
    mutationFn: () => apiPatch<User>("/auth/profile", { current_password: currentPassword, new_password: newPassword }),
    onSuccess: (updated) => { queryClient.setQueryData(["me"], updated); setCurrentPassword(""); setNewPassword(""); setPasswordSaveStatus("Password updated successfully."); setPasswordSaveError(null); toast.success("Password updated"); },
    onError: (error) => { const errorMessage = message(error, "Could not update password"); setPasswordSaveError(errorMessage); toast.error(errorMessage); },
  });
  const resendVerification = useMutation({
    mutationFn: () => apiPost<{ sent: boolean; detail?: string }>("/auth/resend-verification"),
    onSuccess: (result) => { setVerificationStatus(result.detail ?? "Verification email sent. Check your inbox."); toast.success(result.detail ?? "Verification email sent"); },
    onError: (error) => { const errorMessage = message(error, "Could not send another verification email"); setVerificationStatus(errorMessage); toast.error(errorMessage); },
  });

  return <AppShell user={user}>
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"><ArrowLeft className="size-4" />All decks</Link>
    <div className="mt-6 max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-amber-600 dark:text-amber-400">Account settings</p>
      <h1 className="mt-2 font-heading text-4xl font-semibold">Your profile</h1>
      <p className="mt-2 text-muted-foreground">Update the details associated with your deck library.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <form className="rounded-2xl border border-border bg-card p-6 shadow-sm" onSubmit={(event) => { event.preventDefault(); profileUpdate.mutate(); }}>
          <div className="flex items-center gap-2"><UserRound className="size-5 text-amber-600 dark:text-amber-400" /><h2 className="font-heading text-xl font-semibold">Profile details</h2></div>
          <p className="mt-2 text-sm text-muted-foreground">Your username is shown in the navigation and welcome message. It does not change your deck ownership.</p>
          <div className="mt-5 space-y-4"><div className="space-y-2"><Label htmlFor="profile-name">Username</Label><Input id="profile-name" value={displayName} onChange={(event) => { setDisplayName(event.target.value); setProfileSaveStatus(null); setProfileSaveError(null); }} required /></div><div className="space-y-2"><Label htmlFor="profile-email">Email</Label><Input id="profile-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setProfileSaveStatus(null); setProfileSaveError(null); }} required /></div></div>
          <Button type="submit" className="mt-6 bg-amber-600 text-white hover:bg-amber-500 dark:text-black" disabled={profileUpdate.isPending}>{profileUpdate.isPending ? "Saving…" : "Save profile"}</Button>
          {profileSaveStatus ? <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400" role="status" data-testid="profile-save-status"><CheckCircle2 className="size-4" />{profileSaveStatus}</p> : null}
          {profileSaveError ? <p className="mt-3 text-sm font-medium text-destructive" role="alert">{profileSaveError}</p> : null}
        </form>
        <form className="rounded-2xl border border-border bg-card p-6 shadow-sm" onSubmit={(event) => { event.preventDefault(); passwordUpdate.mutate(); }}>
          <div className="flex items-center gap-2"><KeyRound className="size-5 text-amber-600 dark:text-amber-400" /><h2 className="font-heading text-xl font-semibold">Change password</h2></div>
          <p className="mt-2 text-sm text-muted-foreground">Confirm your existing password before choosing a new one.</p>
          <div className="mt-5 space-y-4"><div className="space-y-2"><Label htmlFor="current-password">Current password</Label><Input id="current-password" type="password" value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setPasswordSaveStatus(null); setPasswordSaveError(null); }} required /></div><div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" minLength={6} value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setPasswordSaveStatus(null); setPasswordSaveError(null); }} required /></div></div>
          <Button type="submit" className="mt-6 bg-amber-600 text-white hover:bg-amber-500 dark:text-black" disabled={passwordUpdate.isPending}>{passwordUpdate.isPending ? "Updating…" : "Update password"}</Button>
          {passwordSaveStatus ? <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400" role="status"><CheckCircle2 className="size-4" />{passwordSaveStatus}</p> : null}
          {passwordSaveError ? <p className="mt-3 text-sm font-medium text-destructive" role="alert">{passwordSaveError}</p> : null}
        </form>
        <section className={`rounded-2xl border p-6 shadow-sm lg:col-span-2 ${user?.email_verified ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/35 bg-amber-500/5"}`} data-testid="email-verification-section">
          <div className="flex items-center gap-2">{user?.email_verified ? <MailCheck className="size-5 text-emerald-600 dark:text-emerald-400" /> : <ShieldAlert className="size-5 text-amber-600 dark:text-amber-400" />}<h2 className="font-heading text-xl font-semibold">Email verification</h2></div>
          {user?.email_verified ? <p className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="size-4" />Your email is already verified.</p> : <><p className="mt-3 text-sm text-muted-foreground">Your email is not verified yet. Verify it to keep your account recovery details up to date.</p><Button type="button" className="mt-4 bg-amber-600 text-white hover:bg-amber-500 dark:text-black" onClick={() => { setVerificationStatus(null); resendVerification.mutate(); }} disabled={resendVerification.isPending}>{resendVerification.isPending ? "Sending…" : "Resend verification email"}</Button>{verificationStatus ? <p className="mt-3 text-sm text-muted-foreground" role="status">{verificationStatus}</p> : null}</>}
        </section>
      </div>
    </div>
  </AppShell>;
}
