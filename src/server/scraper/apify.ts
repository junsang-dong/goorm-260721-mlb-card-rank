import { ApifyClient } from "apify-client";
import type { RawScrapedCard } from "../../types/card";

/** Actor from https://console.apify.com/actors/Y7h6Aodb7ZXkv6Ieb */
export const DEFAULT_APIFY_ACTOR_ID = "Y7h6Aodb7ZXkv6Ieb";
const DEFAULT_SEARCH = "MLB sports card";

export interface ApifyEbayProduct {
  type?: string;
  itemId?: string | number;
  title?: string;
  price?: number | null;
  priceString?: string;
  shippingCost?: string | null;
  soldCount?: string | number | null;
  sellerName?: string | null;
  sellerFeedbackPercent?: string | null;
  sellerFeedbackCount?: string | null;
  isSponsored?: boolean;
  thumbnail?: string | null;
  images?: string[];
  url?: string;
}

function parseFeedbackPercent(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = parseFloat(value.replace(/%/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

/** Parses values like "153.4K", "1.2M", "824", "93+". */
function parseCount(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = value.trim().replace(/\+/g, "").replace(/,/g, "");
  const match = cleaned.match(/^([\d.]+)\s*([KMB])?$/i);
  if (!match) {
    const n = parseInt(cleaned, 10);
    return Number.isFinite(n) ? n : null;
  }
  const base = parseFloat(match[1]);
  if (!Number.isFinite(base)) return null;
  const suffix = (match[2] || "").toUpperCase();
  const mult = suffix === "K" ? 1_000 : suffix === "M" ? 1_000_000 : suffix === "B" ? 1_000_000_000 : 1;
  return Math.round(base * mult);
}

function parseShipping(text: string | null | undefined): number | null {
  if (!text) return null;
  if (/free/i.test(text)) return 0;
  const numeric = text.replace(/[^0-9.,]/g, "").replace(/,/g, "");
  const amount = parseFloat(numeric);
  return Number.isFinite(amount) ? amount : null;
}

function parseCurrency(priceString: string | null | undefined): string {
  if (!priceString) return "USD";
  if (/KRW|₩/i.test(priceString)) return "KRW";
  if (/£/.test(priceString)) return "GBP";
  if (/€/.test(priceString)) return "EUR";
  if (/C\s*\$/i.test(priceString)) return "CAD";
  if (/AU\s*\$/i.test(priceString)) return "AUD";
  return "USD";
}

export function mapApifyProductToRawCard(
  product: ApifyEbayProduct,
  listingPosition: number
): RawScrapedCard | null {
  const ebayItemId = product.itemId != null ? String(product.itemId) : null;
  const title = product.title?.trim() || null;
  const url = product.url?.trim() || null;
  if (!ebayItemId || !title || !url) return null;

  const price =
    typeof product.price === "number" && Number.isFinite(product.price) ? product.price : 0;

  return {
    ebayItemId,
    title,
    price,
    currency: parseCurrency(product.priceString),
    shipping: parseShipping(product.shippingCost),
    seller: product.sellerName ?? null,
    sellerRating: parseFeedbackPercent(product.sellerFeedbackPercent),
    reviewCount: parseCount(product.sellerFeedbackCount),
    image: product.thumbnail || product.images?.[0] || null,
    url,
    listingPosition,
    soldCount: parseCount(product.soldCount),
    watchers: null,
    isSponsored: Boolean(product.isSponsored),
  };
}

export interface RunApifyScrapeOptions {
  limit?: number;
  search?: string;
  actorId?: string;
  token?: string;
}

/**
 * Runs the Apify eBay Scraper Actor and returns normalized listing rows.
 * Docs: https://apify.com/automation-lab/ebay-scraper
 */
export async function scrapeEbayViaApify(
  options: RunApifyScrapeOptions = {}
): Promise<RawScrapedCard[]> {
  const token = options.token ?? process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error("APIFY_TOKEN is not set");
  }

  const limit = options.limit ?? (Number(process.env.SCRAPE_LIMIT) || 20);
  const search = options.search ?? process.env.APIFY_SEARCH_QUERY ?? DEFAULT_SEARCH;
  const actorId =
    options.actorId ?? process.env.APIFY_ACTOR_ID ?? DEFAULT_APIFY_ACTOR_ID;

  const client = new ApifyClient({ token });
  const run = await client.actor(actorId).call(
    {
      searchQueries: [search],
      maxProductsPerSearch: limit,
      maxSearchPages: 1,
      sort: "best_match",
    },
    { waitSecs: 120 }
  );

  const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit });
  const cards: RawScrapedCard[] = [];

  for (const item of items) {
    if (cards.length >= limit) break;
    const mapped = mapApifyProductToRawCard(item as ApifyEbayProduct, cards.length + 1);
    if (mapped) cards.push(mapped);
  }

  return cards;
}
