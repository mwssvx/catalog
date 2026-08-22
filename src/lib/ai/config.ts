export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function aiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

export function aiOrgModel(): string {
  return process.env.OPENAI_ORG_MODEL?.trim() || aiModel();
}
