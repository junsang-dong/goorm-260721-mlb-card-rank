import type { RankedCard } from "../types/card";
import { CardRow } from "./CardRow";

export function RankingTable({ cards }: { cards: RankedCard[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">Card</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3">Brand</th>
            <th className="px-4 py-3">Year</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Tags</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {cards.map((card) => (
            <CardRow key={card.id} card={card} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
