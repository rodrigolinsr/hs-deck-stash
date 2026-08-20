import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Home from "@/pages/Home";
import Decks from "@/pages/Decks";
import DeckDetailPage from "@/pages/DeckDetailPage";
import PublicDeckPage from "@/pages/PublicDeckPage";
import PublicProfilePage from "@/pages/PublicProfilePage";
import PlayersPage from "@/pages/PlayersPage";
import ProfilePage from "@/pages/ProfilePage";
import { ResetPasswordPage, VerifyEmailPage } from "@/pages/EmailActionPage";
import { AuthDialogProvider } from "@/components/AppShell";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <AuthDialogProvider><Routes>
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<Decks />} />
        <Route path="/login" element={<Home />} />
        <Route path="/decks/:deckId" element={<DeckDetailPage />} />
        <Route path="/public/decks/:deckId" element={<PublicDeckPage />} />
        <Route path="/players/:username" element={<PublicProfilePage />} />
        <Route path="/players" element={<PlayersPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes></AuthDialogProvider>
      <Toaster richColors position="top-right" />
    </>
  );
}
