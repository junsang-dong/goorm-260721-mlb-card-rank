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

export function CardItem({ card }: { card: RankedCard }) {
  const displayName = card.player || card.title;

  return (
    <a
      href={card.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {card.image ? (
          <img
            src={card.image}
            alt={card.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>
        )}
        <span className="absolute left-3 top-3 rounded-md bg-slate-900/85 px-2.5 py-1 text-xs font-semibold text-white">
          #{card.rank}
        </span>
        {card.source === "apify" && (
          <span className="absolute right-3 top-3 rounded-md bg-sky-700/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            Apify
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900">{displayName}</h2>
          {card.player && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{card.title}</p>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-slate-600">
          <div>
            <dt className="text-slate-400">Team</dt>
            <dd className="mt-0.5 truncate font-medium text-slate-800">{card.team || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Brand</dt>
            <dd className="mt-0.5 truncate font-medium text-slate-800">{card.brand || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Year</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{card.year ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Price</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">
              {formatPrice(card.price, card.currency)}
            </dd>
          </div>
        </dl>

        {(card.rookie || card.grading || card.autograph || card.patch) && (
          <div className="mt-auto flex flex-wrap gap-1">
            {card.rookie && <Badge label="RC" color="emerald" />}
            {card.grading && <Badge label={card.grading} color="indigo" />}
            {card.autograph && <Badge label="Auto" color="amber" />}
            {card.patch && <Badge label="Patch" color="rose" />}
          </div>
        )}
      </div>
    </a>
  );
}
