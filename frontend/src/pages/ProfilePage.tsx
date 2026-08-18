import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, KeyRound, UserRound } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiPatch } from "@/lib/api";
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

  useEffect(() => { if (!isLoading && !user) navigate("/login", { replace: true }); }, [isLoading, user, navigate]);
  useEffect(() => { if (user) { setDisplayName(user.display_name); setEmail(user.email); } }, [user]);

  const profileUpdate = useMutation({
    mutationFn: () => apiPatch<User>("/auth/profile", { display_name: displayName.trim(), email: email.trim() }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      setProfileSaveStatus("Saved. Your name is now shown in the navigation.");
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

  return <AppShell user={user}>
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"><ArrowLeft className="size-4" />All decks</Link>
    <div className="mt-6 max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-amber-600 dark:text-amber-400">Account settings</p>
      <h1 className="mt-2 font-heading text-4xl font-semibold">Your profile</h1>
      <p className="mt-2 text-muted-foreground">Update the details associated with your deck library.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <form className="rounded-2xl border border-border bg-card p-6 shadow-sm" onSubmit={(event) => { event.preventDefault(); profileUpdate.mutate(); }}>
          <div className="flex items-center gap-2"><UserRound className="size-5 text-amber-600 dark:text-amber-400" /><h2 className="font-heading text-xl font-semibold">Profile details</h2></div>
          <p className="mt-2 text-sm text-muted-foreground">Your name is shown in the navigation and welcome message. It does not change your deck ownership.</p>
          <div className="mt-5 space-y-4"><div className="space-y-2"><Label htmlFor="profile-name">Name</Label><Input id="profile-name" value={displayName} onChange={(event) => { setDisplayName(event.target.value); setProfileSaveStatus(null); setProfileSaveError(null); }} required /></div><div className="space-y-2"><Label htmlFor="profile-email">Email</Label><Input id="profile-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setProfileSaveStatus(null); setProfileSaveError(null); }} required /></div></div>
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
      </div>
    </div>
  </AppShell>;
}
