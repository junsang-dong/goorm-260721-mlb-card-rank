import type { VercelRequest, VercelResponse } from "@vercel/node";
import { analyzeUnanalyzedCards } from "../src/server/services/analyze";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const result = await analyzeUnanalyzedCards();
  res.status(200).json(result);
}
