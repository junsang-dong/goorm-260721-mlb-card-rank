export interface RankingInput {
  listingPosition: number;
  sellerRating: number | null;
  reviewCount: number | null;
  soldCount: number | null;
  watchers: number | null;
  isSponsored: boolean;
  investmentScore: number;
}

/**
 * Spec's literal formula is `Watchers + SellerRating + ReviewCount +
 * SponsoredWeight + AIPopularity`. eBay's search-results grid only exposes a
 * watcher count on some listings (observed live: present on high-urgency
 * items like "Last one", absent on most others), so this falls back to
 * eBay's own Best-Match listing position as a popularity proxy whenever
 * watchers isn't available, rather than treating it as 0.
 */
const WATCHERS_WEIGHT = 2;
const POSITION_WEIGHT = 3;
const SELLER_RATING_WEIGHT = 0.5;
const REVIEW_WEIGHT = 4;
const SOLD_WEIGHT = 6;
const SPONSORED_WEIGHT = 5;
const AI_POPULARITY_WEIGHT = 0.8;

const MAX_LISTING_POSITION = 20;

export function computeRankingScore(input: RankingInput): number {
  const popularitySignal =
    input.watchers != null
      ? Math.log1p(input.watchers) * WATCHERS_WEIGHT
      : (MAX_LISTING_POSITION + 1 - input.listingPosition) * POSITION_WEIGHT;

  const sellerRatingSignal = (input.sellerRating ?? 0) * SELLER_RATING_WEIGHT;
  const reviewSignal = Math.log1p(input.reviewCount ?? 0) * REVIEW_WEIGHT;
  const soldSignal = input.soldCount ? Math.log1p(input.soldCount) * SOLD_WEIGHT : 0;
  const sponsoredSignal = input.isSponsored ? SPONSORED_WEIGHT : 0;
  const aiPopularitySignal = input.investmentScore * AI_POPULARITY_WEIGHT;

  return (
    popularitySignal +
    sellerRatingSignal +
    reviewSignal +
    soldSignal +
    sponsoredSignal +
    aiPopularitySignal
  );
}
