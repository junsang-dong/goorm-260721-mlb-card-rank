import { useCards } from "../hooks/useCards";
import { RankingGrid } from "../components/RankingGrid";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";

export function HomePage() {
  const { data, isLoading, isError, refetch } = useCards();

  const apifyCards = data?.apifyCards ?? [];
  const playwrightCards = data?.playwrightCards ?? [];
  const hasAny = apifyCards.length > 0 || playwrightCards.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Today's MLB Card Ranking</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data?.updatedAt
              ? `Updated ${new Date(data.updatedAt).toLocaleString()}`
              : "eBay MLB Sports Card top listings via Apify + Playwright, ranked and AI-analyzed"}
          </p>
        </header>

        {isLoading && <LoadingState />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {!isLoading && !isError && !hasAny && (
          <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500">
            No cards yet — check back after the next scrape.
          </div>
        )}

        {!isLoading && !isError && hasAny && (
          <div className="space-y-12">
            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Apify eBay Scraper</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Best Match TOP{apifyCards.length || 20} from{" "}
                  <a
                    href="https://console.apify.com/actors/Y7h6Aodb7ZXkv6Ieb/input"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
                  >
                    Apify eBay Scraper
                  </a>
                </p>
              </div>
              {apifyCards.length > 0 ? (
                <RankingGrid cards={apifyCards} />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  No Apify results yet. Set <code className="text-xs">APIFY_TOKEN</code> and run scrape.
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Playwright</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Direct browser scrape of eBay search results (existing pipeline)
                </p>
              </div>
              {playwrightCards.length > 0 ? (
                <RankingGrid cards={playwrightCards} />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  No Playwright results yet.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
