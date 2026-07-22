export interface RawScrapedCard {
  ebayItemId: string;
  title: string;
  price: number;
  currency: string;
  shipping: number | null;
  seller: string | null;
  sellerRating: number | null;
  reviewCount: number | null;
  image: string | null;
  url: string;
  listingPosition: number;
  soldCount: number | null;
  watchers: number | null;
  isSponsored: boolean;
}

export interface CardAnalysis {
  player: string;
  team: string;
  brand: string;
  year: number;
  parallelType: string;
  serialNumber: string;
  rookie: boolean;
  autograph: boolean;
  patch: boolean;
  grading: string;
  investmentScore: number;
  summary: string;
}

export interface RankedCard {
  id: string;
  title: string;
  player: string | null;
  team: string | null;
  brand: string | null;
  year: number | null;
  price: number;
  currency: string;
  shipping: number | null;
  image: string | null;
  url: string;
  seller: string | null;
  sellerRating: number | null;
  reviewCount: number | null;
  rookie: boolean;
  autograph: boolean;
  patch: boolean;
  parallelType: string | null;
  serialNumber: string | null;
  grading: string | null;
  investmentScore: number | null;
  summary: string | null;
  rankingScore: number | null;
  rank: number;
}

export interface CardsResponse {
  cards: RankedCard[];
  updatedAt: string | null;
}

export interface ScrapeResponse {
  scraped: number;
  analyzed: number;
  updatedAt?: string;
  error?: string;
}

export interface AnalyzeResponse {
  analyzed: number;
  skipped: number;
  errors: { cardId: string; message: string }[];
}
