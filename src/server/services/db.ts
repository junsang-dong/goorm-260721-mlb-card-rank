import { createClient, type Client } from "@libsql/client";
import type {
  CardAnalysis,
  CardSource,
  RankedCard,
  RawScrapedCard,
} from "../../types/card";

let client: Client | null = null;

export function getDb(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set");

  client = createClient({ url, authToken });
  return client;
}

export interface UpsertCardInput extends RawScrapedCard {
  id: string;
  scrapedAt: string;
  source: CardSource;
}

export async function upsertCard(card: UpsertCardInput): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `
      INSERT INTO cards (
        id, title, price, currency, shipping, seller, seller_rating,
        review_count, image, url, listing_position, sold_count, watchers,
        is_sponsored, source, scraped_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        price = excluded.price,
        currency = excluded.currency,
        shipping = excluded.shipping,
        seller = excluded.seller,
        seller_rating = excluded.seller_rating,
        review_count = excluded.review_count,
        image = excluded.image,
        url = excluded.url,
        listing_position = excluded.listing_position,
        sold_count = excluded.sold_count,
        watchers = excluded.watchers,
        is_sponsored = excluded.is_sponsored,
        source = excluded.source,
        scraped_at = excluded.scraped_at
    `,
    args: [
      card.id,
      card.title,
      card.price,
      card.currency,
      card.shipping,
      card.seller,
      card.sellerRating,
      card.reviewCount,
      card.image,
      card.url,
      card.listingPosition,
      card.soldCount,
      card.watchers,
      card.isSponsored ? 1 : 0,
      card.source,
      card.scrapedAt,
    ],
  });
}

export async function getUnanalyzedCardIds(): Promise<string[]> {
  const db = getDb();
  const result = await db.execute(
    "SELECT id FROM cards WHERE analyzed_at IS NULL"
  );
  return result.rows.map((row) => row.id as string);
}

export interface CardForAnalysis {
  title: string;
  price: number;
  listingPosition: number;
  sellerRating: number | null;
  reviewCount: number | null;
  soldCount: number | null;
  watchers: number | null;
  isSponsored: boolean;
}

export async function getCardForAnalysis(
  cardId: string
): Promise<CardForAnalysis | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `
      SELECT title, price, listing_position, seller_rating, review_count,
             sold_count, watchers, is_sponsored
      FROM cards WHERE id = ?
    `,
    args: [cardId],
  });
  const row = result.rows[0];
  if (!row) return null;
  return {
    title: row.title as string,
    price: row.price as number,
    listingPosition: row.listing_position as number,
    sellerRating: (row.seller_rating as number) ?? null,
    reviewCount: (row.review_count as number) ?? null,
    soldCount: (row.sold_count as number) ?? null,
    watchers: (row.watchers as number) ?? null,
    isSponsored: Boolean(row.is_sponsored),
  };
}

export async function saveAnalysis(
  cardId: string,
  analysis: CardAnalysis,
  rankingScore: number
): Promise<void> {
  const db = getDb();
  const analyzedAt = new Date().toISOString();

  await db.execute({
    sql: `
      INSERT INTO ai_analysis (
        card_id, rookie, autograph, patch, parallel_type, serial_number,
        grading, investment_score, summary, ranking_score, analyzed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(card_id) DO UPDATE SET
        rookie = excluded.rookie,
        autograph = excluded.autograph,
        patch = excluded.patch,
        parallel_type = excluded.parallel_type,
        serial_number = excluded.serial_number,
        grading = excluded.grading,
        investment_score = excluded.investment_score,
        summary = excluded.summary,
        ranking_score = excluded.ranking_score,
        analyzed_at = excluded.analyzed_at
    `,
    args: [
      cardId,
      analysis.rookie ? 1 : 0,
      analysis.autograph ? 1 : 0,
      analysis.patch ? 1 : 0,
      analysis.parallelType || null,
      analysis.serialNumber || null,
      analysis.grading || null,
      analysis.investmentScore,
      analysis.summary,
      rankingScore,
      analyzedAt,
    ],
  });

  await db.execute({
    sql: `
      UPDATE cards SET
        player = ?, team = ?, brand = ?, year = ?, analyzed_at = ?
      WHERE id = ?
    `,
    args: [
      analysis.player || null,
      analysis.team || null,
      analysis.brand || null,
      analysis.year || null,
      analyzedAt,
      cardId,
    ],
  });
}

const RANKED_CARD_SELECT = `
  SELECT
    c.id, c.title, c.player, c.team, c.brand, c.year, c.price, c.currency,
    c.shipping, c.seller, c.seller_rating, c.review_count, c.image, c.url,
    c.source,
    a.rookie, a.autograph, a.patch, a.parallel_type, a.serial_number,
    a.grading, a.investment_score, a.summary, a.ranking_score
  FROM cards c
  JOIN ai_analysis a ON a.card_id = c.id
`;

function normalizeSource(value: unknown): CardSource {
  return value === "apify" ? "apify" : "playwright";
}

function rowToRankedCard(row: Record<string, unknown>, rank: number): RankedCard {
  return {
    id: row.id as string,
    title: row.title as string,
    player: (row.player as string) ?? null,
    team: (row.team as string) ?? null,
    brand: (row.brand as string) ?? null,
    year: (row.year as number) ?? null,
    price: row.price as number,
    currency: row.currency as string,
    shipping: (row.shipping as number) ?? null,
    image: (row.image as string) ?? null,
    url: row.url as string,
    seller: (row.seller as string) ?? null,
    sellerRating: (row.seller_rating as number) ?? null,
    reviewCount: (row.review_count as number) ?? null,
    rookie: Boolean(row.rookie),
    autograph: Boolean(row.autograph),
    patch: Boolean(row.patch),
    parallelType: (row.parallel_type as string) ?? null,
    serialNumber: (row.serial_number as string) ?? null,
    grading: (row.grading as string) ?? null,
    investmentScore: (row.investment_score as number) ?? null,
    summary: (row.summary as string) ?? null,
    rankingScore: (row.ranking_score as number) ?? null,
    rank,
    source: normalizeSource(row.source),
  };
}

export async function getTopCardsBySource(
  source: CardSource,
  limit = 20
): Promise<RankedCard[]> {
  const db = getDb();
  const result = await db.execute({
    sql: `${RANKED_CARD_SELECT} WHERE c.source = ? ORDER BY a.ranking_score DESC LIMIT ?`,
    args: [source, limit],
  });

  return result.rows.map((row, index) =>
    rowToRankedCard(row as unknown as Record<string, unknown>, index + 1)
  );
}

export async function getTopCards(limit = 20): Promise<{
  cards: RankedCard[];
  apifyCards: RankedCard[];
  playwrightCards: RankedCard[];
  updatedAt: string | null;
}> {
  const [apifyCards, playwrightCards] = await Promise.all([
    getTopCardsBySource("apify", limit),
    getTopCardsBySource("playwright", limit),
  ]);

  // Apify list first, then Playwright — as requested for the UI.
  const cards = [...apifyCards, ...playwrightCards].map((card, index) => ({
    ...card,
    rank: index + 1,
  }));

  const db = getDb();
  const maxScraped = await db.execute("SELECT MAX(scraped_at) as m FROM cards");
  const updatedAt = (maxScraped.rows[0]?.m as string) ?? null;

  return { cards, apifyCards, playwrightCards, updatedAt };
}

export async function getCardById(id: string): Promise<RankedCard | null> {
  const db = getDb();
  const result = await db.execute({
    sql: `${RANKED_CARD_SELECT} WHERE c.id = ?`,
    args: [id],
  });
  const row = result.rows[0];
  if (!row) return null;
  return rowToRankedCard(row as unknown as Record<string, unknown>, 0);
}
