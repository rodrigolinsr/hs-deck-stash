import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Compass, LibraryBig, Search, Sparkles, Tags, UsersRound } from "lucide-react";
import AppShell from "@/components/AppShell";
import PublicDeckCard from "@/components/deck/PublicDeckCard";
import { Input } from "@/components/ui/input";
import { apiGet } from "@/lib/api";
import { CLASS_ORDER, classTheme } from "@/lib/hsclasses";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuthDialog } from "@/components/AppShell";
import type { PublicDeckSummary, PublicTag } from "@/lib/types";

export default function Home() {
  const { user } = useCurrentUser();
  const openAuth = useAuthDialog();
  const [search, setSearch] = useState("");
  const [heroClass, setHeroClass] = useState("ALL");
  const [tag, setTag] = useState("");
  const deckPath = useMemo(() => {
    const query = new URLSearchParams();
    if (search.trim()) query.set("search", search.trim());
    if (heroClass !== "ALL") query.set("hero_class", heroClass);
    if (tag) query.set("tag", tag);
    return `/public/decks${query.size ? `?${query}` : ""}`;
  }, [heroClass, search, tag]);
  const decksQuery = useQuery<PublicDeckSummary[]>({ queryKey: ["public-decks", search, heroClass, tag], queryFn: () => apiGet<PublicDeckSummary[]>(deckPath) });
  const tagsQuery = useQuery<PublicTag[]>({ queryKey: ["public-tags"], queryFn: () => apiGet<PublicTag[]>("/public/decks/discover/tags") });

  return <AppShell user={user}>
    <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div><p className="font-mono text-xs uppercase tracking-[0.22em] text-amber-700 dark:text-amber-400">Community deckbook</p><h1 className="mt-2 font-heading text-2xl font-semibold sm:text-3xl">Discover a deck. Make it yours.</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Browse player-published lists, copy a code into Hearthstone, or keep your own deck trail organised in one place.</p></div>
      {user ? <Link to="/library" className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-500 dark:text-black"><LibraryBig className="mr-2 size-4" />My library</Link> : <button type="button" onClick={openAuth} className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-500 dark:text-black">Create a library<ArrowRight className="ml-2 size-4" /></button>}
    </section>
    <section className="mt-9">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><Compass className="size-4 text-amber-600 dark:text-amber-400" /><p className="font-mono text-xs uppercase tracking-[0.22em] text-amber-700 dark:text-amber-400">Discover</p></div><h2 className="mt-2 font-heading text-3xl font-semibold">Fresh decklists</h2></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search decks or tags…" className="pl-9" aria-label="Search public decks" /></div></div>
      <div className="mt-5 flex flex-wrap gap-2" aria-label="Filter by class"><button type="button" onClick={() => setHeroClass("ALL")} className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${heroClass === "ALL" ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300" : "border-border text-muted-foreground hover:bg-muted"}`}>All classes</button>{CLASS_ORDER.map((key) => { const theme = classTheme(key); return <button key={key} type="button" onClick={() => setHeroClass(key)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${heroClass === key ? "bg-muted text-foreground" : "border-border text-muted-foreground hover:bg-muted"}`} style={heroClass === key ? { borderColor: theme.color } : undefined}>{theme.icon ? <img src={theme.icon} alt="" className="size-4" /> : null}{theme.name}</button>; })}</div>
      {tagsQuery.data?.length ? <div className="mt-4 flex flex-wrap items-center gap-2"><span className="mr-1 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Tags className="size-3.5" />Tags</span>{tagsQuery.data.map((item) => <button type="button" key={item.name} onClick={() => setTag(tag === item.name ? "" : item.name)} className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${tag === item.name ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300" : "border-border text-muted-foreground hover:bg-muted"}`}>{item.name} <span className="opacity-60">{item.deck_count}</span></button>)}</div> : null}
      <p className="mt-5 text-sm text-muted-foreground">Duplicate deck codes are grouped here; every player’s own publication remains on their profile.</p>
      <div className="mt-5">{decksQuery.isLoading ? <p className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Finding newly published decks…</p> : decksQuery.isError ? <p className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Community decks are unavailable right now. Please try again shortly.</p> : decksQuery.data?.length ? <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{decksQuery.data.map((deck) => <PublicDeckCard key={deck.id} deck={deck} />)}</div> : <div className="rounded-2xl border border-dashed border-border bg-card/70 p-12 text-center"><Sparkles className="mx-auto size-8 text-amber-500/70" /><p className="mt-4 font-heading text-xl font-semibold">No published decks match yet</p><p className="mt-2 text-sm text-muted-foreground">Try another class, tag, or search term.</p></div>}</div>
    </section>
    <section className="mt-12 rounded-2xl border border-border bg-muted/40 p-6 sm:flex sm:items-center sm:justify-between"><div className="flex items-start gap-3"><UsersRound className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" /><div><h2 className="font-heading text-xl font-semibold">Browse players, not just lists.</h2><p className="mt-1 text-sm text-muted-foreground">See each player’s published deckbook and the decks they chose to share.</p></div></div><Link to="/players" className="mt-4 inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent sm:mt-0">Browse players<ArrowRight className="ml-2 size-4" /></Link></section>
  </AppShell>;
}
