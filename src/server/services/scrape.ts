import type { Browser } from "playwright-core";
import { launchBrowser } from "../scraper/browser";
import {
  EBAY_CONTEXT_OPTIONS,
  navigateToMlbCardSearch,
  scrapeEbayListings,
} from "../scraper/ebay";
import { scrapeEbayViaApify } from "../scraper/apify";
import { upsertCard } from "./db";

export interface RunScrapeResult {
  scraped: number;
  scrapedApify?: number;
  scrapedPlaywright?: number;
  error?: string;
}

/**
 * Runs one full scrape pass and persists results. Scrape failures (eBay
 * markup changes, bot-detection, navigation timeouts) are caught here and
 * returned as a soft failure (scraped: 0, error: "...") rather than thrown,
 * so a daily cron run doesn't show as a hard function error every time
 * eBay's page changes shape.
 *
 * `browserLauncher` defaults to the production launcher (playwright-core +
 * @sparticuz/chromium, Linux-only). It's overridable so local dev/test
 * scripts can inject the full `playwright` package's browser instead —
 * @sparticuz/chromium's binary can't execute on macOS/Windows, so this is
 * how the rest of this exact code path (DB writes, analyze trigger) gets
 * exercised outside of an actual Vercel (Linux) deployment.
 */
export async function runPlaywrightScrape(
  limit: number,
  browserLauncher: () => Promise<Browser> = launchBrowser
): Promise<RunScrapeResult> {
  let browser;
  try {
    browser = await browserLauncher();
    const context = await browser.newContext(EBAY_CONTEXT_OPTIONS);
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });
    const page = await context.newPage();

    await navigateToMlbCardSearch(page);
    const cards = await scrapeEbayListings(page, limit);

    const scrapedAt = new Date().toISOString();
    for (const card of cards) {
      await upsertCard({
        ...card,
        id: `ebay-${card.ebayItemId}`,
        scrapedAt,
        source: "playwright",
      });
    }

    return { scraped: cards.length, scrapedPlaywright: cards.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[scrape:playwright] failed:", err);
    return { scraped: 0, scrapedPlaywright: 0, error: message };
  } finally {
    await browser?.close();
  }
}

/** @deprecated Prefer runPlaywrightScrape — kept for existing scripts. */
export async function runScrape(
  limit: number,
  browserLauncher: () => Promise<Browser> = launchBrowser
): Promise<RunScrapeResult> {
  return runPlaywrightScrape(limit, browserLauncher);
}

/**
 * Collects up to `limit` Best Match listings via Apify eBay Scraper Actor
 * (https://console.apify.com/actors/Y7h6Aodb7ZXkv6Ieb) and upserts them.
 */
export async function runApifyScrape(limit: number): Promise<RunScrapeResult> {
  try {
    const cards = await scrapeEbayViaApify({ limit });
    const scrapedAt = new Date().toISOString();
    for (const card of cards) {
      await upsertCard({
        ...card,
        id: `apify-${card.ebayItemId}`,
        scrapedAt,
        source: "apify",
      });
    }
    return { scraped: cards.length, scrapedApify: cards.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[scrape:apify] failed:", err);
    return { scraped: 0, scrapedApify: 0, error: message };
  }
}

/**
 * Runs Apify first, then Playwright. Partial success is OK: one source can
 * fail without aborting the other. Aggregated `error` is set only when both
 * fail (or Apify is missing credentials and Playwright also fails).
 */
export async function runCombinedScrape(
  limit: number,
  browserLauncher: () => Promise<Browser> = launchBrowser
): Promise<RunScrapeResult> {
  const apifyResult = await runApifyScrape(limit);
  const playwrightResult = await runPlaywrightScrape(limit, browserLauncher);

  const scrapedApify = apifyResult.scrapedApify ?? 0;
  const scrapedPlaywright = playwrightResult.scrapedPlaywright ?? 0;
  const scraped = scrapedApify + scrapedPlaywright;

  const errors = [apifyResult.error, playwrightResult.error].filter(Boolean);
  const error =
    scraped === 0 && errors.length > 0
      ? errors.join(" | ")
      : scrapedApify === 0 && apifyResult.error
        ? `Apify: ${apifyResult.error}`
        : undefined;

  if (apifyResult.error) console.warn("[scrape] Apify issue:", apifyResult.error);
  if (playwrightResult.error) {
    console.warn("[scrape] Playwright issue:", playwrightResult.error);
  }

  return {
    scraped,
    scrapedApify,
    scrapedPlaywright,
    error,
  };
}
