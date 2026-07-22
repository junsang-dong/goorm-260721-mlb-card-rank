import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCardById } from "../../src/server/services/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { id } = req.query;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const card = await getCardById(id);
  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  res.status(200).json(card);
}
