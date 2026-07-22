import OpenAI from "openai";
import type { CardAnalysis } from "../../types/card";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  client = new OpenAI({ apiKey });
  return client;
}

const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are an expert MLB trading-card cataloguer. Given only an eBay listing title (and optionally its price), extract structured card metadata.

Rules:
- Be conservative: only fill in a field if the title actually implies it. Never invent a player name, brand, or year that isn't supported by the text.
- Use "" (empty string) for text fields you cannot determine, and false for boolean flags you cannot confirm.
- rookie/autograph/patch should be true only if the title contains a clear signal (e.g. "RC", "Rookie", "Auto", "Autograph", "Patch", "Relic").
- grading should capture things like "PSA 10", "BGS 9.5", "SGC 10", or "Raw" if ungraded and not mentioned; use "" if unclear.
- investmentScore (0-100) should reflect collectibility: weigh rookie status, autograph, patch/relic, numbered/serial parallels, and grading quality. A common base, ungraded, non-numbered veteran card should score low (10-30); a graded rookie autograph patch card should score high (85-100).
- summary should be a concise 1-2 sentence collector-facing note in Korean, mentioning the most relevant investment signals.`;

const CARD_ANALYSIS_SCHEMA = {
  name: "card_analysis",
  strict: true,
  schema: {
    type: "object",
    properties: {
      player: { type: "string" },
      team: { type: "string" },
      brand: { type: "string" },
      year: { type: "integer" },
      parallelType: { type: "string" },
      serialNumber: { type: "string" },
      rookie: { type: "boolean" },
      autograph: { type: "boolean" },
      patch: { type: "boolean" },
      grading: { type: "string" },
      investmentScore: { type: "integer" },
      summary: { type: "string" },
    },
    required: [
      "player",
      "team",
      "brand",
      "year",
      "parallelType",
      "serialNumber",
      "rookie",
      "autograph",
      "patch",
      "grading",
      "investmentScore",
      "summary",
    ],
    additionalProperties: false,
  },
} as const;

export async function analyzeCardTitle(
  title: string,
  price?: number
): Promise<CardAnalysis> {
  const openai = getClient();

  const userContent = price
    ? `Title: ${title}\nPrice: $${price}`
    : `Title: ${title}`;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    response_format: {
      type: "json_schema",
      json_schema: CARD_ANALYSIS_SCHEMA,
    },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("GPT returned an empty response");

  return JSON.parse(content) as CardAnalysis;
}
