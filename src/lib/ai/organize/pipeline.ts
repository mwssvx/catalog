import { organizeBatchSize } from "@/lib/ai/client";
import { getDescribeProvider } from "@/lib/ai/organize/describe";
import {
  buildCandidateGroups,
  highConfidenceGroups,
  reviewGroups,
  verifyGroups,
} from "@/lib/ai/organize/grouping";
import {
  detectDuplicates,
  elementToDescriptorSeed,
  markNearDuplicates,
} from "@/lib/ai/organize/media";
import type {
  AiJob,
  AiJobProgress,
  AiJobResult,
  AiJobStatus,
  MediaDescriptor,
  ProposedGroup,
} from "@/lib/ai/types";
import type { CatalogData } from "@/lib/catalog/types";

export function createOrganizeProgress(total: number): AiJobProgress {
  return {
    total,
    processed: 0,
    batchSize: organizeBatchSize(),
    cursor: 0,
    phase: "queued",
  };
}

export function seedDescriptors(
  data: CatalogData,
  elementIds?: string[],
): MediaDescriptor[] {
  const selected = new Set(elementIds ?? []);
  return data.board.elements
    .filter(
      (element) =>
        element.type === "media" &&
        element.mediaUrl &&
        (selected.size === 0 || selected.has(element.id)),
    )
    .map(elementToDescriptorSeed)
    .filter((entry): entry is MediaDescriptor => Boolean(entry));
}

/**
 * Advance one batch of the organization pipeline. Safe to resume.
 * Does not publish. High-confidence groups are marked for auto-apply;
 * uncertain groups stay in proposals for seller review.
 */
export async function tickOrganizeJob(
  job: AiJob,
  data: CatalogData,
): Promise<AiJob> {
  if (job.status === "cancelled" || job.status === "completed") return job;
  if (job.status === "failed") return job;

  const seeds =
    job.result.descriptors.length > 0
      ? job.result.descriptors
      : seedDescriptors(data, job.elementIds);

  const progress = { ...job.progress, total: seeds.length };
  let descriptors = [...seeds];
  let proposals = [...job.proposals];
  let result = { ...job.result, descriptors };
  let status: AiJobStatus =
    job.status === "queued" ? "running" : job.status;
  let summary = job.summary;
  let error: string | null = job.error;

  try {
    if (progress.phase === "queued") {
      progress.phase = "classify";
    }

    if (
      progress.phase === "classify" ||
      progress.phase === "dedupe" ||
      progress.phase === "describe"
    ) {
      progress.phase = "describe";
      const start = progress.cursor;
      const end = Math.min(start + progress.batchSize, descriptors.length);
      const batch = descriptors.slice(start, end);
      if (batch.length) {
        const described = await getDescribeProvider()(batch);
        descriptors = descriptors.map((entry) => {
          const next = described.find((row) => row.elementId === entry.elementId);
          return next ?? entry;
        });
        progress.cursor = end;
        progress.processed = end;
      }
      if (progress.cursor >= descriptors.length) {
        progress.phase = "dedupe";
      }
    }

    if (progress.phase === "dedupe") {
      descriptors = markNearDuplicates(detectDuplicates(descriptors));
      const pairs: AiJobResult["duplicatePairs"] = [];
      for (const entry of descriptors) {
        if (entry.duplicateOf) {
          pairs.push({
            a: entry.elementId,
            b: entry.duplicateOf,
            kind: "exact",
          });
        }
        for (const other of entry.nearDuplicateOf ?? []) {
          pairs.push({ a: entry.elementId, b: other, kind: "near" });
        }
      }
      result = {
        ...result,
        descriptors,
        duplicatePairs: pairs,
        unrelatedElementIds: descriptors
          .filter((entry) => entry.descriptors.isPersonalOrUnrelated)
          .map((entry) => entry.elementId),
      };
      progress.phase = "group";
    }

    if (progress.phase === "group") {
      proposals = buildCandidateGroups(descriptors);
      progress.phase = "verify";
    }

    if (progress.phase === "verify") {
      proposals = verifyGroups(proposals);
      const needsReview = reviewGroups(proposals);
      const auto = highConfidenceGroups(proposals);
      if (needsReview.length > 0) {
        status = "waiting_for_review";
        progress.phase = "review";
        summary = `Prepared ${proposals.length} draft groups. ${needsReview.length} need your review. ${auto.length} look safe. Nothing published.`;
      } else if (auto.length > 0) {
        status = "waiting_for_review";
        progress.phase = "review";
        summary = `Prepared ${auto.length} high-confidence draft groups for approval. Nothing published.`;
      } else {
        status = "completed";
        progress.phase = "done";
        summary = "No clothing media found to organize.";
      }
    }

    result = { ...result, descriptors };
  } catch (caught) {
    status = "failed";
    error = caught instanceof Error ? caught.message : "Organization failed";
    summary = error;
  }

  return {
    ...job,
    status,
    progress,
    proposals,
    result,
    summary,
    error,
    updatedAt: new Date().toISOString(),
  };
}

export function proposalsToOrganizeGroups(proposals: ProposedGroup[]) {
  return proposals
    .filter((group) => group.status === "approved" || group.status === "edited")
    .map((group) => ({
      title: group.title,
      category: group.category,
      confidence: group.confidence >= 0.7 ? ("high" as const) : ("low" as const),
      variants: group.variants.map((variant) => ({
        color: variant.color,
        mediaUrls: variant.mediaUrls,
      })),
    }));
}
