import type {
  MediaDescriptor,
  ProposedGroup,
  ProposedVariant,
} from "@/lib/ai/types";
import type { Category } from "@/lib/catalog/types";

function signature(entry: MediaDescriptor): string {
  const d = entry.descriptors;
  return [
    d.clothingType ?? "?",
    d.silhouette ?? "?",
    d.cut ?? "?",
    d.collar ?? "?",
    d.sleeves ?? "?",
    d.buttons ?? "?",
    d.pockets ?? "?",
    d.pattern ?? "?",
    d.logo ?? "?",
  ].join("|");
}

function colorKey(entry: MediaDescriptor): string {
  return (entry.descriptors.visibleColor || "unknown").toLowerCase();
}

/**
 * Build candidate product groups.
 * Prefer keeping products separate over unsafe merges (requires strong signature match).
 */
export function buildCandidateGroups(
  descriptors: MediaDescriptor[],
): ProposedGroup[] {
  const clothing = descriptors.filter(
    (entry) =>
      !entry.duplicateOf &&
      entry.descriptors.isClothing &&
      !entry.descriptors.isPersonalOrUnrelated,
  );

  const buckets = new Map<string, MediaDescriptor[]>();
  for (const entry of clothing) {
    const key = signature(entry);
    // Weak signatures (lots of unknowns) stay alone.
    const unknowns = key.split("|").filter((part) => part === "?").length;
    const bucketKey = unknowns >= 6 ? `solo:${entry.elementId}` : key;
    const list = buckets.get(bucketKey) ?? [];
    list.push(entry);
    buckets.set(bucketKey, list);
  }

  const groups: ProposedGroup[] = [];
  let index = 0;
  for (const [, members] of buckets) {
    const byColor = new Map<string, MediaDescriptor[]>();
    for (const member of members) {
      const key = colorKey(member);
      const list = byColor.get(key) ?? [];
      list.push(member);
      byColor.set(key, list);
    }

    const variants: ProposedVariant[] = [];
    for (const [color, colorMembers] of byColor) {
      // Collapse exact duplicates into same variant angles.
      const unique = colorMembers.filter((entry) => !entry.duplicateOf);
      variants.push({
        id: crypto.randomUUID(),
        color: color === "unknown" ? null : color,
        colorConfidence: color === "unknown" ? 0.3 : 0.7,
        elementIds: unique.map((entry) => entry.elementId),
        mediaUrls: unique.map((entry) => entry.mediaUrl),
      });
    }

    const sample = members[0];
    const avgConfidence =
      members.reduce((sum, entry) => sum + entry.descriptors.confidence, 0) /
      members.length;
    const uncertain: string[] = [];
    const fields: Array<keyof typeof sample.descriptors> = [
      "clothingType",
      "silhouette",
      "cut",
      "collar",
      "sleeves",
      "buttons",
      "pockets",
      "stitching",
      "pattern",
      "logo",
      "visibleColor",
    ];
    for (const field of fields) {
      if (!sample.descriptors[field]) uncertain.push(field);
    }

    const category = (sample.descriptors.category ?? null) as Category | null;
    const title =
      [sample.descriptors.visibleColor, sample.descriptors.clothingType]
        .filter(Boolean)
        .join(" ") || `Вещь ${index + 1}`;

    const strong =
      avgConfidence >= 0.65 &&
      Boolean(sample.descriptors.clothingType) &&
      Boolean(sample.descriptors.silhouette || sample.descriptors.cut);

    groups.push({
      id: crypto.randomUUID(),
      title,
      category,
      confidence: Number(avgConfidence.toFixed(2)),
      explanation: strong
        ? "Matching cut/details across angles and colors; proposed as one model with color variants."
        : "Weak or incomplete visible match — needs seller review before merge.",
      status: "pending",
      variants,
      uncertainAttributes: uncertain,
      maybeSameAsGroupIds: [],
    });
    index += 1;
  }

  // Link uncertain near-matches for review without auto-merging.
  for (let i = 0; i < groups.length; i += 1) {
    for (let j = i + 1; j < groups.length; j += 1) {
      const a = groups[i];
      const b = groups[j];
      if (a.category && b.category && a.category === b.category) {
        const aType = a.title.split(" ").slice(-1)[0];
        const bType = b.title.split(" ").slice(-1)[0];
        if (aType && aType === bType && a.confidence < 0.7 && b.confidence < 0.7) {
          a.maybeSameAsGroupIds.push(b.id);
          b.maybeSameAsGroupIds.push(a.id);
        }
      }
    }
  }

  return groups;
}

export function verifyGroups(groups: ProposedGroup[]): ProposedGroup[] {
  return groups.map((group) => {
    const mediaCount = group.variants.reduce(
      (sum, variant) => sum + variant.elementIds.length,
      0,
    );
    if (mediaCount === 0) {
      return {
        ...group,
        confidence: 0,
        explanation: "Empty group discarded for review.",
        status: "pending",
      };
    }
    // Prefer separate: multi-color without cut/type evidence stays low confidence.
    if (
      group.variants.length > 1 &&
      group.uncertainAttributes.includes("cut") &&
      group.uncertainAttributes.includes("silhouette")
    ) {
      return {
        ...group,
        confidence: Math.min(group.confidence, 0.45),
        explanation:
          "Multiple colors without clear shared cut — keep separate unless you confirm.",
      };
    }
    return group;
  });
}

export function highConfidenceGroups(groups: ProposedGroup[]): ProposedGroup[] {
  return groups.filter((group) => group.confidence >= 0.7 && group.status === "pending");
}

export function reviewGroups(groups: ProposedGroup[]): ProposedGroup[] {
  return groups.filter((group) => group.confidence < 0.7 && group.status === "pending");
}
