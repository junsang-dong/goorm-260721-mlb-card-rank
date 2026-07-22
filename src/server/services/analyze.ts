import { getUnanalyzedCardIds, getCardForAnalysis, saveAnalysis } from "./db";
import { analyzeCardTitle } from "./gpt";
import { computeRankingScore } from "./ranking";
import type { AnalyzeResponse } from "../../types/card";

const DEFAULT_CONCURRENCY = 3;

/**
 * Analyzes every card with analyzed_at IS NULL via GPT, computes its ranking
 * score, and persists both. Runs a small worker pool (not one big
 * Promise.all) to cap concurrent OpenAI calls against rate limits and the
 * calling function's own time budget.
 */
export async function analyzeUnanalyzedCards(
  concurrency = DEFAULT_CONCURRENCY
): Promise<AnalyzeResponse> {
  const cardIds = await getUnanalyzedCardIds();
  let analyzed = 0;
  let skipped = 0;
  const errors: { cardId: string; message: string }[] = [];

  let cursor = 0;
  async function worker() {
    while (cursor < cardIds.length) {
      const cardId = cardIds[cursor++];
      try {
        const card = await getCardForAnalysis(cardId);
        if (!card) {
          skipped++;
          continue;
        }

        const analysis = await analyzeCardTitle(card.title, card.price);
        const rankingScore = computeRankingScore({
          listingPosition: card.listingPosition,
          sellerRating: card.sellerRating,
          reviewCount: card.reviewCount,
          soldCount: card.soldCount,
          watchers: card.watchers,
          isSponsored: card.isSponsored,
          investmentScore: analysis.investmentScore,
        });

        await saveAnalysis(cardId, analysis, rankingScore);
        analyzed++;
      } catch (err) {
        errors.push({
          cardId,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  const workerCount = Math.min(concurrency, cardIds.length) || 0;
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return { analyzed, skipped, errors };
}
