/**
 * Local-only dev script: uses the full `playwright` package (real bundled
 * browser, fast to iterate with) instead of the playwright-core +
 * @sparticuz/chromium combo the deployed API route uses. Run with:
 *   npx tsx scripts/dev-scrape.ts
 */
import { chromium } from "playwright";
import {
  EBAY_CONTEXT_OPTIONS,
  navigateToMlbCardSearch,
  scrapeEbayListings,
} from "../src/server/scraper/ebay";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext(EBAY_CONTEXT_OPTIONS);
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  const page = await context.newPage();

  await navigateToMlbCardSearch(page);
  const cards = await scrapeEbayListings(page, 20);

  console.log(`Scraped ${cards.length} listings`);
  console.log(JSON.stringify(cards, null, 2));

  await browser.close();
}

main().catch((err) => {
  console.error("dev-scrape failed:", err);
  process.exit(1);
});
