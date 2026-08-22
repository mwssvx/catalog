import type { SupabaseClient } from "@supabase/supabase-js";
import {
  jobToRow,
  parseJobRow,
  type AiJobRepository,
} from "@/lib/ai/jobs";
import type { AiJob } from "@/lib/ai/types";

function isMissingColumnError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";
  return /column .* does not exist|Could not find the '.+' column/i.test(message);
}

export class SupabaseAiJobs implements AiJobRepository {
  constructor(private client: SupabaseClient) {}

  async listJobs(shopId: string): Promise<AiJob[]> {
    const { data, error } = await this.client
      .from("ai_jobs")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) {
      // Older schemas without organization columns still list basic jobs.
      if (isMissingColumnError(error)) return [];
      throw error;
    }
    return (data ?? []).map((row) => parseJobRow(row as Record<string, unknown>));
  }

  async getJob(shopId: string, id: string): Promise<AiJob | null> {
    const { data, error } = await this.client
      .from("ai_jobs")
      .select("*")
      .eq("shop_id", shopId)
      .eq("id", id)
      .maybeSingle();
    if (error) {
      if (isMissingColumnError(error)) return null;
      throw error;
    }
    if (!data) return null;
    return parseJobRow(data as Record<string, unknown>);
  }

  async saveJob(job: AiJob): Promise<AiJob> {
    const row = jobToRow(job);
    const { data: existing } = await this.client
      .from("ai_jobs")
      .select("id")
      .eq("id", job.id)
      .maybeSingle();
    if (existing?.id) {
      const rich = {
        kind: row.kind,
        status: row.status,
        prompt: row.prompt,
        element_ids: row.element_ids,
        progress: row.progress,
        proposals: row.proposals,
        result: row.result,
        summary: row.summary,
        error: row.error,
      };
      const first = await this.client
        .from("ai_jobs")
        .update(rich)
        .eq("id", job.id)
        .eq("shop_id", job.shopId);
      if (first.error && isMissingColumnError(first.error)) {
        const basic = await this.client
          .from("ai_jobs")
          .update({
            status: row.status,
            prompt: row.prompt,
            result: row.result,
          })
          .eq("id", job.id)
          .eq("shop_id", job.shopId);
        if (basic.error) throw basic.error;
      } else if (first.error) {
        throw first.error;
      }
    } else {
      const first = await this.client.from("ai_jobs").insert(row);
      if (first.error && isMissingColumnError(first.error)) {
        const basic = await this.client.from("ai_jobs").insert({
          id: row.id,
          shop_id: row.shop_id,
          status: row.status,
          prompt: row.prompt,
          result: row.result,
        });
        if (basic.error) throw basic.error;
      } else if (first.error) {
        throw first.error;
      }
    }
    return (await this.getJob(job.shopId, job.id)) ?? job;
  }
}
