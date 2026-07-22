import { useQuery } from "@tanstack/react-query";
import type { CardsResponse } from "../types/card";

async function fetchCards(): Promise<CardsResponse> {
  const res = await fetch("/api/cards");
  if (!res.ok) throw new Error(`Failed to fetch cards: ${res.status}`);
  return res.json();
}

export function useCards() {
  return useQuery({
    queryKey: ["cards"],
    queryFn: fetchCards,
  });
}
