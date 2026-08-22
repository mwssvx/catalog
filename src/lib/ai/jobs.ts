import type {
  AiJob,
  AiJobKind,
  AiJobProgress,
  AiJobResult,
  AiJobStatus,
  ProposedGroup,
} from "@/lib/ai/types";
import { createOrganizeProgress } from "@/lib/ai/organize/pipeline";

export function emptyJobResult(): AiJobResult {
  return {
    descriptors: [],
    unrelatedElementIds: [],
    duplicatePairs: [],
    createdProductIds: [],
    appliedGroupIds: [],
  };
}

export function newOrganizeJob(input: {
  shopId: string;
  prompt: string;
  elementIds: string[];
  total: number;
}): AiJob {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    shopId: input.shopId,
    kind: "organize",
    status: "queued",
    prompt: input.prompt,
    elementIds: input.elementIds,
    progress: createOrganizeProgress(input.total),
    proposals: [],
    result: emptyJobResult(),
    summary: "Queued",
    error: null,
    createdAt: now,
    updatedAt: now,
  };
}

export type AiJobRepository = {
  listJobs(shopId: string): Promise<AiJob[]>;
  getJob(shopId: string, id: string): Promise<AiJob | null>;
  saveJob(job: AiJob): Promise<AiJob>;
};

/** In-memory jobs for tests / local without Supabase job columns. */
export class MemoryAiJobs implements AiJobRepository {
  private jobs = new Map<string, AiJob>();

  async listJobs(shopId: string): Promise<AiJob[]> {
    return [...this.jobs.values()]
      .filter((job) => job.shopId === shopId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getJob(shopId: string, id: string): Promise<AiJob | null> {
    const job = this.jobs.get(id);
    if (!job || job.shopId !== shopId) return null;
    return structuredClone(job);
  }

  async saveJob(job: AiJob): Promise<AiJob> {
    const next = { ...job, updatedAt: new Date().toISOString() };
    this.jobs.set(next.id, structuredClone(next));
    return structuredClone(next);
  }
}

export function parseJobRow(row: Record<string, unknown>): AiJob {
  const progress = (row.progress as AiJobProgress) ?? createOrganizeProgress(0);
  const rawResult = (row.result as Partial<AiJobResult> | null) ?? {};
  const result: AiJobResult = {
    ...emptyJobResult(),
    ...rawResult,
    unrelatedElementIds: rawResult.unrelatedElementIds ?? [],
    descriptors: rawResult.descriptors ?? [],
    duplicatePairs: rawResult.duplicatePairs ?? [],
    createdProductIds: rawResult.createdProductIds ?? [],
    appliedGroupIds: rawResult.appliedGroupIds ?? [],
  };
  return {
    id: String(row.id),
    shopId: String(row.shop_id),
    kind: (row.kind as AiJobKind) || "organize",
    status: (row.status as AiJobStatus) || "queued",
    prompt: String(row.prompt ?? ""),
    elementIds: (row.element_ids as string[]) ?? [],
    progress: {
      ...createOrganizeProgress(0),
      ...progress,
    },
    proposals: (row.proposals as ProposedGroup[]) ?? [],
    result,
    summary: String(row.summary ?? ""),
    error: (row.error as string | null) ?? null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

export function jobToRow(job: AiJob) {
  return {
    id: job.id,
    shop_id: job.shopId,
    kind: job.kind,
    status: job.status,
    prompt: job.prompt,
    element_ids: job.elementIds,
    progress: job.progress,
    proposals: job.proposals,
    result: job.result,
    summary: job.summary,
    error: job.error,
  };
}
