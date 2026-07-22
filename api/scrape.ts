import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runCombinedScrape } from "../src/server/services/scrape";
import { analyzeUnanalyzedCards } from "../src/server/services/analyze";
import type { ScrapeResponse } from "../src/types/card";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const limit = Number(process.env.SCRAPE_LIMIT) || 20;
  const scrapeResult = await runCombinedScrape(limit);

  if (scrapeResult.scraped === 0 && scrapeResult.error) {
    const response: ScrapeResponse = {
      scraped: 0,
      scrapedApify: scrapeResult.scrapedApify ?? 0,
      scrapedPlaywright: scrapeResult.scrapedPlaywright ?? 0,
      analyzed: 0,
      error: scrapeResult.error,
    };
    res.status(200).json(response);
    return;
  }

  const analyzeResult = await analyzeUnanalyzedCards();

  const response: ScrapeResponse = {
    scraped: scrapeResult.scraped,
    scrapedApify: scrapeResult.scrapedApify ?? 0,
    scrapedPlaywright: scrapeResult.scrapedPlaywright ?? 0,
    analyzed: analyzeResult.analyzed,
    updatedAt: new Date().toISOString(),
    error: scrapeResult.error,
  };
  res.status(200).json(response);
}
