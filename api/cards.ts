import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getTopCards } from "../src/server/services/db";
import type { CardsResponse } from "../src/types/card";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { cards, apifyCards, playwrightCards, updatedAt } = await getTopCards(20);
  const response: CardsResponse = { cards, apifyCards, playwrightCards, updatedAt };
  res.status(200).json(response);
}
