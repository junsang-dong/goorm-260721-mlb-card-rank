import type { RankedCard } from "../types/card";

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

type BadgeColor = "emerald" | "indigo" | "amber" | "rose";

const BADGE_COLORS: Record<BadgeColor, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  indigo: "bg-indigo-100 text-indigo-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
};

function Badge({ label, color }: { label: string; color: BadgeColor }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_COLORS[color]}`}>
      {label}
    </span>
  );
}

export function CardRow({ card }: { card: RankedCard }) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3 align-top font-semibold text-slate-700">{card.rank}</td>
      <td className="px-4 py-3 align-top">
        <a href={card.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
          {card.image && (
            <img
              src={card.image}
              alt={card.title}
              className="h-14 w-14 shrink-0 rounded object-cover"
            />
          )}
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-900">{card.player || card.title}</div>
            <div className="truncate text-xs text-slate-500">{card.title}</div>
          </div>
        </a>
      </td>
      <td className="px-4 py-3 align-top text-slate-600">{card.team || "—"}</td>
      <td className="px-4 py-3 align-top text-slate-600">{card.brand || "—"}</td>
      <td className="px-4 py-3 align-top text-slate-600">{card.year ?? "—"}</td>
      <td className="px-4 py-3 align-top font-semibold text-slate-900">
        {formatPrice(card.price, card.currency)}
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-wrap gap-1">
          {card.rookie && <Badge label="RC" color="emerald" />}
          {card.grading && <Badge label={card.grading} color="indigo" />}
          {card.autograph && <Badge label="Auto" color="amber" />}
          {card.patch && <Badge label="Patch" color="rose" />}
        </div>
      </td>
    </tr>
  );
}
