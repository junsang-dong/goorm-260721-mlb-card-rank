/**
 * Local-only: run Apify eBay Scraper → Turso upsert → GPT analyze.
 * Requires APIFY_TOKEN in .env
 *   https://console.apify.com/
 *   Actor: https://console.apify.com/actors/Y7h6Aodb7ZXkv6Ieb/input
 *
 * Run with: npx tsx scripts/dev-apify-scrape.ts
 */
import "dotenv/config";
import { runApifyScrape } from "../src/server/services/scrape";
import { analyzeUnanalyzedCards } from "../src/server/services/analyze";

async function main() {
  if (!process.env.APIFY_TOKEN) {
    console.error("APIFY_TOKEN is not set. Add it to .env from https://console.apify.com/");
    process.exit(1);
  }

  const limit = Number(process.env.SCRAPE_LIMIT) || 20;
  console.log(`Apify scrape (limit=${limit})...`);
  const scrapeResult = await runApifyScrape(limit);
  console.log("Scrape result:", scrapeResult);

  if (scrapeResult.scraped === 0) {
    process.exit(1);
  }

  console.log("Analyzing...");
  const analyzeResult = await analyzeUnanalyzedCards();
  console.log("Analyze result:", analyzeResult);
}

main().catch((err) => {
  console.error("dev-apify-scrape failed:", err);
  process.exit(1);
});
