import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, UserRound, UsersRound } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { apiGet } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { PublicPlayerSummary } from "@/lib/types";
import { useState } from "react";

export default function PlayersPage() {
  const { user } = useCurrentUser();
  const [search, setSearch] = useState("");
  const playersQuery = useQuery<PublicPlayerSummary[]>({ queryKey: ["public-players"], queryFn: () => apiGet<PublicPlayerSummary[]>("/public/decks/players") });
  const players = (playersQuery.data ?? []).filter((player) => `${player.display_name} ${player.username}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <AppShell user={user}><section className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-xs uppercase tracking-[0.22em] text-amber-700 dark:text-amber-400">Community</p><h1 className="mt-2 flex items-center gap-2 font-heading text-3xl font-semibold"><UsersRound className="size-6 text-amber-600 dark:text-amber-400" />Player deckbooks</h1><p className="mt-2 text-sm text-muted-foreground">Find a player and explore the decks they made public.</p></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search players…" className="pl-9" /></div></section><section className="mt-7">{playersQuery.isLoading ? <p className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading player deckbooks…</p> : playersQuery.isError ? <p className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Player deckbooks are unavailable right now.</p> : players.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{players.map((player) => <Link key={player.username} to={`/players/${player.username}`} className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-md"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300"><UserRound className="size-5" /></span><div className="min-w-0"><p className="truncate font-heading text-lg font-semibold">{player.display_name}</p><p className="truncate text-sm text-muted-foreground">@{player.username}</p></div></div><div className="mt-5 flex items-center justify-between text-sm text-muted-foreground"><span>{player.deck_count} published {player.deck_count === 1 ? "deck" : "decks"}</span><ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></div></Link>)}</div> : <p className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No players match that search.</p>}</section></AppShell>;
}
