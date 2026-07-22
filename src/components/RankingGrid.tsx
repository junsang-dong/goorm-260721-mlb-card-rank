import { useMemo, useState } from "react";
import type { RankedCard } from "../types/card";
import { CardItem } from "./CardItem";

export type SortKey = "rank" | "card" | "team" | "brand" | "year" | "price";
type SortDir = "asc" | "desc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "rank", label: "Rank" },
  { key: "card", label: "Card" },
  { key: "team", label: "Team" },
  { key: "brand", label: "Brand" },
  { key: "year", label: "Year" },
  { key: "price", label: "Price" },
];

function compareNullableString(a: string | null, b: string | null, direction: number): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.toLowerCase().localeCompare(b.toLowerCase()) * direction;
}

function compareNullableNumber(a: number | null, b: number | null, direction: number): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return (a - b) * direction;
}

function compareCards(a: RankedCard, b: RankedCard, key: SortKey, direction: number): number {
  switch (key) {
    case "rank":
      return (a.rank - b.rank) * direction;
    case "card":
      return compareNullableString(a.player || a.title, b.player || b.title, direction);
    case "team":
      return compareNullableString(a.team, b.team, direction);
    case "brand":
      return compareNullableString(a.brand, b.brand, direction);
    case "year":
      return compareNullableNumber(a.year, b.year, direction);
    case "price":
      return (a.price - b.price) * direction;
  }
}

export function RankingGrid({ cards }: { cards: RankedCard[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sortedCards = useMemo(() => {
    const direction = sortDir === "asc" ? 1 : -1;
    return [...cards].sort((a, b) => compareCards(a, b, sortKey, direction));
  }, [cards, sortKey, sortDir]);

  function handleSortChange(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "price" || key === "year" ? "desc" : "asc");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Showing <span className="font-medium text-slate-700">{sortedCards.length}</span> cards
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Sort by</span>
          {SORT_OPTIONS.map(({ key, label }) => {
            const active = sortKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSortChange(key)}
                className={`rounded-md border px-3 py-1.5 text-sm transition ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
                aria-pressed={active}
              >
                {label}
                {active && (
                  <span className="ml-1.5 inline-block text-xs opacity-80" aria-hidden>
                    {sortDir === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedCards.map((card) => (
          <CardItem key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
