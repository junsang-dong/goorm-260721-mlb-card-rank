import { useCards } from "../hooks/useCards";
import { RankingGrid } from "../components/RankingGrid";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";

export function HomePage() {
  const { data, isLoading, isError, refetch } = useCards();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Today's MLB Card Ranking</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data?.updatedAt
              ? `Updated ${new Date(data.updatedAt).toLocaleString()}`
              : "eBay MLB Sports Card top listings, ranked and AI-analyzed"}
          </p>
        </header>

        {isLoading && <LoadingState />}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {!isLoading && !isError && data && data.cards.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-500">
            No cards yet — check back after the next scrape.
          </div>
        )}
        {!isLoading && !isError && data && data.cards.length > 0 && (
          <RankingGrid cards={data.cards} />
        )}
      </div>
    </div>
  );
}
