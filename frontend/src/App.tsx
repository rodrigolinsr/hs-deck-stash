import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Login from "@/pages/Login";
import Decks from "@/pages/Decks";
import DeckDetailPage from "@/pages/DeckDetailPage";
import ProfilePage from "@/pages/ProfilePage";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Decks />} />
        <Route path="/login" element={<Login />} />
        <Route path="/decks/:deckId" element={<DeckDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  );
}
