import { createContext, useContext, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpenCheck, LogIn, LogOut, MailWarning, Settings, UsersRound } from "lucide-react";
import AppBrand from "@/components/AppBrand";
import AuthDialog from "@/components/AuthDialog";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { endSession } from "@/lib/session";
import type { User } from "@/lib/types";

interface AppShellProps { user?: User | null; children: ReactNode; }

const AuthDialogContext = createContext<(() => void) | null>(null);

export function useAuthDialog() {
  const openAuth = useContext(AuthDialogContext);
  if (!openAuth) throw new Error("useAuthDialog must be used inside AppShell");
  return openAuth;
}

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [authOpen, setAuthOpen] = useState(false);
  return <AuthDialogContext.Provider value={() => setAuthOpen(true)}>{children}<AuthDialog open={authOpen} onOpenChange={setAuthOpen} /></AuthDialogContext.Provider>;
}

export default function AppShell({ user, children }: AppShellProps) {
  const navigate = useNavigate();
  const openAuth = useAuthDialog();
  async function signOut() { await endSession(); navigate("/login", { replace: true }); }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(760px_320px_at_12%_-10%,rgba(217,119,6,0.16),transparent_70%),radial-gradient(600px_300px_at_88%_-20%,rgba(59,130,246,0.10),transparent_70%)]" />
      <header className="relative z-10 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-7"><AppBrand link className="h-9 sm:h-10" /><nav className="hidden items-center gap-1 md:flex" aria-label="Primary"><Link to="/" className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">Discover</Link><Link to="/players" className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">Players</Link></nav></div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {user ? <>
              <Link to="/library" className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-500/20 dark:text-amber-300" aria-label="Open my saved decks"><BookOpenCheck className="size-4" /><span className="hidden sm:inline">My decks</span></Link>
              <Link to="/profile" className="hidden items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex" data-testid="profile-link">
                <Settings className="size-4" />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="max-w-40 truncate font-medium text-foreground">{user.display_name || user.email}</span>
                  <span className="max-w-40 truncate text-xs text-muted-foreground">{user.email}</span>
                </span>
              </Link>
              <Link to="/profile" aria-label="Profile settings" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground sm:hidden"><Settings className="size-4" /></Link>
              <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out" data-testid="sign-out-button">
                <LogOut className="size-4 sm:mr-1.5" /><span className="hidden sm:inline">Sign out</span>
              </Button>
            </> : <><Link to="/players" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden" aria-label="Browse players"><UsersRound className="size-4" /></Link><Button variant="outline" size="sm" onClick={openAuth}><LogIn className="size-4 sm:mr-1.5" /><span className="hidden sm:inline">Sign in</span></Button></>}
          </div>
        </div>
      </header>
      {user && !user.email_verified ? <div className="relative z-10 border-b border-amber-500/25 bg-amber-500/10"><div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-sm text-amber-800 dark:text-amber-300 sm:px-6"><MailWarning className="size-4 shrink-0" /><span>Your email has not been verified.</span><Link to="/profile" className="ml-auto font-medium underline underline-offset-2 hover:text-amber-600 dark:hover:text-amber-100">Verify it</Link></div></div> : null}
      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">{children}</main>
    </div>
  );
}
