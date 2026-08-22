import OpenAI from "openai";
import { aiModel, isAiConfigured } from "@/lib/ai/config";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  if (!isAiConfigured()) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return client;
}

export function configuredModel(): string {
  return aiModel();
}

/** Batch size for organization pipeline (~200 media supported via many batches). */
export function organizeBatchSize(): number {
  const raw = Number(process.env.OPENAI_ORG_BATCH_SIZE ?? "12");
  if (!Number.isFinite(raw) || raw < 1) return 12;
  return Math.min(24, Math.floor(raw));
}
