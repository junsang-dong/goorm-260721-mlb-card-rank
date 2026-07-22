import type { Browser } from "playwright-core";
import { launchBrowser } from "../scraper/browser";
import {
  EBAY_CONTEXT_OPTIONS,
  navigateToMlbCardSearch,
  scrapeEbayListings,
} from "../scraper/ebay";
import { upsertCard } from "./db";

export interface RunScrapeResult {
  scraped: number;
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
export async function runScrape(
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
      await upsertCard({ ...card, id: `ebay-${card.ebayItemId}`, scrapedAt });
    }

    return { scraped: cards.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[scrape] failed:", err);
    return { scraped: 0, error: message };
  } finally {
    await browser?.close();
  }
}
