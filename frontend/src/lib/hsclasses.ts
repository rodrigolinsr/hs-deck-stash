export interface ClassTheme {
  name: string;
  color: string;
  bg: string;
  border: string;
  image?: string;
  icon?: string;
}

export const CLASS_THEMES: Record<string, ClassTheme> = {
  DEATHKNIGHT: { name: "Death Knight", color: "#C41E3A", bg: "#2A1015", border: "#7F1D1D", image: "/heroes/deathknight.jpg", icon: "/class-icons/deathknight.png" },
  DEMONHUNTER: { name: "Demon Hunter", color: "#15803D", bg: "#0D2316", border: "#166534", image: "/heroes/demonhunter.jpg", icon: "/class-icons/demonhunter.png" },
  DRUID: { name: "Druid", color: "#FF7C0A", bg: "#2E1B09", border: "#9A3412", image: "/heroes/druid.jpg", icon: "/class-icons/druid.png" },
  HUNTER: { name: "Hunter", color: "#AAD372", bg: "#1D2811", border: "#4D7C0F", image: "/heroes/hunter.jpg", icon: "/class-icons/hunter.png" },
  MAGE: { name: "Mage", color: "#3FC7EB", bg: "#0E242E", border: "#0284C7", image: "/heroes/mage.jpg", icon: "/class-icons/mage.png" },
  PALADIN: { name: "Paladin", color: "#F48CBA", bg: "#2B1421", border: "#BE185D", image: "/heroes/paladin.jpg", icon: "/class-icons/paladin.png" },
  PRIEST: { name: "Priest", color: "#E8EAF2", bg: "#242733", border: "#64748B", image: "/heroes/priest.jpg", icon: "/class-icons/priest.png" },
  ROGUE: { name: "Rogue", color: "#FFF468", bg: "#2B280E", border: "#CA8A04", image: "/heroes/rogue.jpg", icon: "/class-icons/rogue.png" },
  SHAMAN: { name: "Shaman", color: "#3B8BE0", bg: "#0C1F38", border: "#1D4ED8", image: "/heroes/shaman.jpg", icon: "/class-icons/shaman.png" },
  WARLOCK: { name: "Warlock", color: "#8788EE", bg: "#1C1C36", border: "#6366F1", image: "/heroes/warlock.jpg", icon: "/class-icons/warlock.png" },
  WARRIOR: { name: "Warrior", color: "#C69B6D", bg: "#291E16", border: "#B45309", image: "/heroes/warrior.jpg", icon: "/class-icons/warrior.png" },
  NEUTRAL: { name: "Neutral", color: "#9CA3AF", bg: "#1A1D27", border: "#374151" },
};

export const CLASS_ORDER = Object.keys(CLASS_THEMES).filter((k) => k !== "NEUTRAL");

export function classTheme(key: string): ClassTheme {
  return CLASS_THEMES[key] ?? CLASS_THEMES.NEUTRAL;
}

export const RARITY_COLORS: Record<string, string> = {
  LEGENDARY: "#F59E0B",
  EPIC: "#A855F7",
  RARE: "#3B82F6",
  COMMON: "#94A3B8",
  FREE: "#6B7280",
};
