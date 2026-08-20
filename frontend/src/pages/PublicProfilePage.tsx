import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, LibraryBig, UserRound } from "lucide-react";
import AppShell from "@/components/AppShell";
import PublicDeckCard from "@/components/deck/PublicDeckCard";
import { apiGet } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { PublicProfile } from "@/lib/types";

export default function PublicProfilePage() {
  const { username = "" } = useParams();
  const { user } = useCurrentUser();
  const profileQuery = useQuery<PublicProfile>({ queryKey: ["public-profile", username], queryFn: () => apiGet<PublicProfile>(`/public/decks/players/${encodeURIComponent(username)}`), enabled: Boolean(username), retry: false });
  const profile = profileQuery.data;
  return <AppShell user={user}>
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Explore decks</Link>
    {profileQuery.isLoading ? <p className="mt-12 text-center text-sm text-muted-foreground">Loading player profile…</p> : profileQuery.isError || !profile ? <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-border bg-card p-8 text-center"><UserRound className="mx-auto size-8 text-muted-foreground" /><h1 className="mt-4 font-heading text-2xl font-semibold">This player profile is unavailable</h1><p className="mt-2 text-sm text-muted-foreground">They may not have a public deck library yet.</p></div> : <><section className="mt-6 rounded-3xl border border-border bg-card p-7 sm:p-10"><div className="flex items-center gap-4"><span className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300"><UserRound className="size-7" /></span><div><p className="font-mono text-xs uppercase tracking-[0.22em] text-amber-700 dark:text-amber-400">Player deckbook</p><h1 className="mt-1 font-heading text-3xl font-semibold">{profile.display_name}</h1><p className="mt-1 text-sm text-muted-foreground">@{profile.username} · {profile.decks.length} published {profile.decks.length === 1 ? "deck" : "decks"}</p></div></div></section><section className="mt-9"><div className="flex items-center gap-2"><LibraryBig className="size-5 text-amber-600 dark:text-amber-400" /><h2 className="font-heading text-2xl font-semibold">Published decks</h2></div>{profile.decks.length ? <div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{profile.decks.map((deck) => <PublicDeckCard key={deck.id} deck={deck} showAuthor={false} />)}</div> : <p className="mt-5 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No public decks yet.</p>}</section></>}
  </AppShell>;
}
