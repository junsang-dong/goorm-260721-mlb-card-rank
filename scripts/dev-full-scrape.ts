/**
 * Local-only dev script that exercises the exact production pipeline
 * (runScrape -> DB upsert -> analyzeUnanalyzedCards -> ranking score) using
 * the full `playwright` package's local browser instead of
 * playwright-core + @sparticuz/chromium, since that binary is Linux-only
 * and can't run on macOS/Windows dev machines. On an actual Vercel
 * deployment, api/scrape.ts uses the default (production) launcher.
 * Run with: npx tsx scripts/dev-full-scrape.ts
 */
import "dotenv/config";
import { chromium, type Browser } from "playwright";
import { runCombinedScrape } from "../src/server/services/scrape";
import { analyzeUnanalyzedCards } from "../src/server/services/analyze";

async function localLaunchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
}

async function main() {
  const limit = Number(process.env.SCRAPE_LIMIT) || 20;

  console.log("Scraping (Apify + Playwright)...");
  const scrapeResult = await runCombinedScrape(limit, localLaunchBrowser);
  console.log("Scrape result:", scrapeResult);

  if (scrapeResult.scraped === 0) {
    process.exit(1);
  }

  console.log("Analyzing...");
  const analyzeResult = await analyzeUnanalyzedCards();
  console.log("Analyze result:", analyzeResult);
}

main().catch((err) => {
  console.error("dev-full-scrape failed:", err);
  process.exit(1);
});
