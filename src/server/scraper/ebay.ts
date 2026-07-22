import type { Page } from "playwright-core";
import type { RawScrapedCard } from "../../types/card";

const SEARCH_KEYWORD = "MLB Sports Card";
const DESKTOP_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const EBAY_CONTEXT_OPTIONS = {
  userAgent: DESKTOP_USER_AGENT,
  locale: "en-US",
  viewport: { width: 1280, height: 900 },
  extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
};

/**
 * eBay's search-results endpoint (/sch/i.html) is behind bot mitigation that
 * 403s direct navigation, even from a real (non-headless-detectable) browser.
 * Requesting it via organic in-page navigation from the homepage's own search
 * box carries the session/referrer continuity the bot check expects, and
 * reliably passes. Do not replace this with a direct page.goto(searchUrl).
 */
export async function navigateToMlbCardSearch(page: Page): Promise<void> {
  await page.goto("https://www.ebay.com/", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForTimeout(1500);
  await page.fill("#gh-ac", SEARCH_KEYWORD);
  await page.click("#gh-search-btn");
  await page.waitForLoadState("domcontentloaded", { timeout: 30_000 });
  await page.waitForSelector("li.s-card", { timeout: 15_000 });
}

interface ExtractedCard {
  ebayItemId: string | null;
  title: string | null;
  priceText: string | null;
  image: string | null;
  href: string | null;
  attributeRows: string[];
  secondarySpans: string[];
  isSponsored: boolean;
}

/** Runs inside the browser page (page.evaluate) — DOM APIs only, no Node imports. */
function extractCardsInPage(): ExtractedCard[] {
  const cards = Array.from(document.querySelectorAll("li.s-card"));
  return cards.map((card) => {
    const title =
      card.querySelector(".s-card__title .su-styled-text")?.textContent?.trim() ?? null;
    const priceText = card.querySelector(".s-card__price")?.textContent?.trim() ?? null;
    const image = card.querySelector(".s-card__image")?.getAttribute("src") ?? null;
    const href = card.querySelector("a.s-card__link")?.getAttribute("href") ?? null;
    const attributeRows = Array.from(card.querySelectorAll(".s-card__attribute-row")).map(
      (row) => row.textContent?.trim() ?? ""
    );
    const secondarySpans = Array.from(
      card.querySelectorAll(".su-card-container__attributes__secondary .s-card__attribute-row span")
    ).map((span) => span.textContent?.trim() ?? "");
    const sponsoredBadges = Array.from(
      card.querySelectorAll(".s-card__sep b span[aria-hidden]")
    ).map((span) => (span.textContent ?? "").split("").reverse().join(""));

    return {
      ebayItemId: card.getAttribute("data-listingid"),
      title,
      priceText,
      image,
      href,
      attributeRows,
      secondarySpans,
      isSponsored: sponsoredBadges.some((b) => b.toLowerCase() === "sponsored"),
    };
  });
}

const CURRENCY_PATTERNS: [RegExp, string][] = [
  [/^KRW/i, "KRW"],
  [/^US\s*\$/i, "USD"],
  [/^C\s*\$/i, "CAD"],
  [/^AU\s*\$/i, "AUD"],
  [/^\$/, "USD"],
  [/^£/, "GBP"],
  [/^€/, "EUR"],
  [/^¥/, "JPY"],
  [/^₩/, "KRW"],
];

function parsePrice(text: string | null): { amount: number; currency: string } {
  if (!text) return { amount: 0, currency: "USD" };
  const trimmed = text.trim();
  let currency = "USD";
  for (const [pattern, code] of CURRENCY_PATTERNS) {
    if (pattern.test(trimmed)) {
      currency = code;
      break;
    }
  }
  const numeric = trimmed.replace(/[^0-9.,]/g, "").replace(/,/g, "");
  const amount = parseFloat(numeric);
  return { amount: Number.isFinite(amount) ? amount : 0, currency };
}

function parseCountWithSuffix(raw: string): number | null {
  const match = raw.match(/([\d.]+)\s*([KM]?)/i);
  if (!match) return null;
  const base = parseFloat(match[1]);
  if (!Number.isFinite(base)) return null;
  const suffix = match[2]?.toUpperCase();
  if (suffix === "K") return Math.round(base * 1_000);
  if (suffix === "M") return Math.round(base * 1_000_000);
  return Math.round(base);
}

function findInRows(rows: string[], pattern: RegExp): number | null {
  for (const row of rows) {
    const match = row.match(pattern);
    if (match) return parseCountWithSuffix(match[1]);
  }
  return null;
}

function parseShipping(rows: string[]): number | null {
  const shippingRow = rows.find((r) => /shipping/i.test(r));
  if (!shippingRow) return null;
  if (/free/i.test(shippingRow)) return 0;
  const { amount } = parsePrice(shippingRow);
  return amount || null;
}

function parseSeller(secondarySpans: string[]): {
  seller: string | null;
  sellerRating: number | null;
  reviewCount: number | null;
} {
  if (secondarySpans.length === 0) {
    return { seller: null, sellerRating: null, reviewCount: null };
  }
  const seller = secondarySpans[0] || null;
  const ratingText = secondarySpans.slice(1).join(" ");
  const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)%\s*positive\s*\(([\d.]+[KM]?)\)/i);
  if (!ratingMatch) return { seller, sellerRating: null, reviewCount: null };
  return {
    seller,
    sellerRating: parseFloat(ratingMatch[1]),
    reviewCount: parseCountWithSuffix(ratingMatch[2]),
  };
}

function toAbsoluteUrl(href: string): string {
  try {
    return new URL(href, "https://www.ebay.com").toString();
  } catch {
    return href;
  }
}

/**
 * Extracts up to `limit` real listings from an eBay MLB card search results
 * page already navigated via navigateToMlbCardSearch(). Every field is
 * extracted defensively (try/catch -> null) so one malformed listing can't
 * abort the whole batch; "Shop on eBay" placeholder ad slots are skipped.
 */
export async function scrapeEbayListings(
  page: Page,
  limit: number
): Promise<RawScrapedCard[]> {
  const rawCards = await page.evaluate(extractCardsInPage);

  const results: RawScrapedCard[] = [];
  let position = 0;

  for (const raw of rawCards) {
    if (results.length >= limit) break;
    if (!raw.ebayItemId || !raw.title) continue;
    if (raw.title.trim().toLowerCase() === "shop on ebay") continue;
    if (!raw.href) continue;

    try {
      const { amount: price, currency } = parsePrice(raw.priceText);
      const { seller, sellerRating, reviewCount } = parseSeller(raw.secondarySpans);

      position += 1;
      results.push({
        ebayItemId: raw.ebayItemId,
        title: raw.title,
        price,
        currency,
        shipping: parseShipping(raw.attributeRows),
        seller,
        sellerRating,
        reviewCount,
        image: raw.image,
        url: toAbsoluteUrl(raw.href),
        listingPosition: position,
        soldCount: findInRows(raw.attributeRows, /(\d[\d,]*)\s*sold/i),
        watchers: findInRows(raw.attributeRows, /(\d[\d,]*)\s*watchers?/i),
        isSponsored: raw.isSponsored,
      });
    } catch (err) {
      console.warn(`[ebay scraper] skipped a malformed listing (id=${raw.ebayItemId}):`, err);
    }
  }

  return results;
}
