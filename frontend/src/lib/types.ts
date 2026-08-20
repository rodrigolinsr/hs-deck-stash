// Hand-written mirrors of the Pydantic models in backend/models/schemas.py.
export interface User {
  id: string;
  email: string;
  display_name: string;
  email_verified: boolean;
}

export interface DeckCard {
  dbf_id: number;
  card_id: string;
  name: string;
  cost: number;
  count: number;
  rarity: string;
  card_class: string;
  type: string;
  text: string;
  attack: number;
  health: number;
  tile_url: string;
  render_url: string;
}

export interface DeckSummary {
  id: string;
  name: string;
  code: string;
  notes: string;
  tags: string[];
  folder_id: string | null;
  hero_class: string;
  hero_class_name: string;
  hero_name: string;
  format: string;
  card_count: number;
  dust_cost: number;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  created_at: string;
}

export interface FolderDeleteResult {
  deleted: boolean;
  unfoldered_decks: number;
}

export interface DeckDetail extends DeckSummary {
  cards: DeckCard[];
}

export interface DeckPreview {
  format: string;
  hero_class: string;
  hero_class_name: string;
  hero_name: string;
  card_count: number;
  dust_cost: number;
  cards: DeckCard[];
  duplicate_of_id: string | null;
  duplicate_of_name: string | null;
}

export interface DeleteResult {
  deleted: boolean;
}
