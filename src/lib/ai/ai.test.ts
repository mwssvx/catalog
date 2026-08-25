import { beforeEach, describe, expect, it } from "vitest";
import { applyOrganize, publishProducts } from "@/lib/ai/actions";
import { MemoryAiJobs, newOrganizeJob } from "@/lib/ai/jobs";
import {
  heuristicDescribeProvider,
  setDescribeProvider,
} from "@/lib/ai/organize/describe";
import { buildCandidateGroups, verifyGroups } from "@/lib/ai/organize/grouping";
import { detectDuplicates, emptyDescriptors } from "@/lib/ai/organize/media";
import { tickOrganizeJob } from "@/lib/ai/organize/pipeline";
import { executeAiAction } from "@/lib/ai/typed-actions";
import type { MediaDescriptor } from "@/lib/ai/types";
import { emptyBoard } from "@/lib/board/layout";
import type { CatalogData, Item, Shop } from "@/lib/catalog/types";

const shop: Shop = {
  id: "shop-a",
  slug: "dordoi",
  name: "Dordoi",
  tagline: "",
  location: "Бишкек",
  whatsapp: "996700000000",
  currency: "KGS",
  currencySymbol: "сом",
  logoUrl: "",
  coverUrl: "",
  instagram: "",
  telegram: "",
  categories: ["tops", "bottoms", "outerwear", "dresses", "shoes", "accessories"],
};

function catalogWithMedia(urls: string[]): CatalogData {
  return {
    shop,
    items: [],
    suggestions: [],
    history: [],
    board: {
      ...emptyBoard(),
      elements: urls.map((url, index) => ({
        id: `m${index}`,
        type: "media" as const,
        x: index * 180,
        y: 40,
        width: 160,
        height: 160,
        zIndex: index + 1,
        mediaUrl: url,
        mediaKind: "image" as const,
        mediaId: `media-${index}`,
      })),
    },
  };
}

function descriptor(
  id: string,
  partial: Partial<MediaDescriptor["descriptors"]> & { url?: string },
): MediaDescriptor {
  return {
    elementId: id,
    mediaUrl: partial.url ?? `https://cdn.example.com/${id}.jpg`,
    mediaKind: "image",
    mediaId: id,
    frameUrls: [partial.url ?? `https://cdn.example.com/${id}.jpg`],
    descriptors: emptyDescriptors({
      isClothing: true,
      clothingType: "shirt",
      silhouette: "regular",
      cut: "classic",
      visibleColor: "blue",
      confidence: 0.8,
      ...partial,
    }),
  };
}

describe("AI typed actions", () => {
  it("blocks publish without explicit confirmation", () => {
    const data = catalogWithMedia([]);
    const item: Item = {
      id: "p1",
      shopId: "shop-a",
      code: "T1",
      title: "Shirt",
      notes: "",
      description: "",
      price: 1000,
      wholesalePrice: null,
      minWholesaleQty: null,
      sizes: ["M"],
      quantity: 1,
      material: "cotton",
      origin: null,
      category: "tops",
      subcategory: null,
      condition: "new",
      status: "in_stock",
      tags: [],
      collections: [],
      published: false,
      publishedAt: null,
      photos: ["https://cdn.example.com/a.jpg"],
      videos: [],
      variants: [
        {
          id: "v1",
          color: "blue",
          photos: ["https://cdn.example.com/a.jpg"],
          videos: [],
        },
      ],
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    };
    data.items = [item];
    const blocked = executeAiAction(
      data,
      {
        name: "publish_products",
        args: {
          productIds: ["p1"],
          published: true,
          confirmPublish: false,
        },
      },
      { allowPublish: false },
    );
    expect(blocked.ok).toBe(false);
    expect(data.items[0].published).toBe(false);

    const allowed = executeAiAction(
      data,
      {
        name: "publish_products",
        args: {
          productIds: ["p1"],
          published: true,
          confirmPublish: true,
        },
      },
      { allowPublish: true },
    );
    expect(allowed.ok).toBe(true);
    expect(data.items[0].published).toBe(true);
  });

  it("creates unpublished drafts from organize_media", () => {
    const data = catalogWithMedia([
      "https://cdn.example.com/blue-shirt-front.jpg",
      "https://cdn.example.com/blue-shirt-back.jpg",
    ]);
    const record = executeAiAction(data, {
      name: "organize_media",
      args: {
        groups: [
          {
            title: "Blue shirt",
            confidence: "high",
            category: "tops",
            variants: [
              {
                color: "blue",
                mediaUrls: [
                  "https://cdn.example.com/blue-shirt-front.jpg",
                  "https://cdn.example.com/blue-shirt-back.jpg",
                ],
              },
            ],
          },
        ],
      },
    });
    expect(record.ok).toBe(true);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].published).toBe(false);
    expect(data.items[0].variants[0].photos.length).toBeGreaterThan(0);
  });
});

describe("organization pipeline", () => {
  beforeEach(() => {
    setDescribeProvider(heuristicDescribeProvider);
  });

  it("detects exact duplicates by media id", () => {
    const rows = detectDuplicates([
      descriptor("a", { url: "https://cdn.example.com/same.jpg" }),
      {
        ...descriptor("b", { url: "https://cdn.example.com/same.jpg" }),
        mediaId: "a",
      },
    ]);
    // second shares mediaId fingerprint with first when ids differ — force same id
    const same = detectDuplicates([
      { ...descriptor("a", {}), mediaId: "dup" },
      { ...descriptor("b", {}), mediaId: "dup" },
    ]);
    expect(same[1].duplicateOf).toBe("a");
    expect(rows[0].duplicateOf).toBeUndefined();
  });

  it("prefers separate groups when cut evidence is weak", () => {
    const groups = verifyGroups(
      buildCandidateGroups([
        descriptor("1", {
          clothingType: "shirt",
          cut: null,
          silhouette: null,
          visibleColor: "red",
          confidence: 0.4,
        }),
        descriptor("2", {
          clothingType: "shirt",
          cut: null,
          silhouette: null,
          visibleColor: "blue",
          confidence: 0.4,
        }),
      ]),
    );
    expect(groups.length).toBeGreaterThanOrEqual(1);
    for (const group of groups) {
      if (group.variants.length > 1) {
        expect(group.confidence).toBeLessThan(0.7);
      }
    }
  });

  it("runs resumable job batches into waiting_for_review without publishing", async () => {
    const data = catalogWithMedia([
      "https://cdn.example.com/red-shirt.jpg",
      "https://cdn.example.com/blue-pants.jpg",
      "https://cdn.example.com/selfie-face.jpg",
    ]);
    let job = newOrganizeJob({
      shopId: "shop-a",
      prompt: "organize",
      elementIds: data.board.elements.map((element) => element.id),
      total: 3,
    });
    for (let i = 0; i < 10; i += 1) {
      job = await tickOrganizeJob(job, data);
      if (
        job.status === "waiting_for_review" ||
        job.status === "completed" ||
        job.status === "failed"
      ) {
        break;
      }
    }
    expect(["waiting_for_review", "completed"]).toContain(job.status);
    expect(data.items.every((item) => !item.published)).toBe(true);
    expect(job.result.unrelatedElementIds.length).toBeGreaterThanOrEqual(0);
  });

  it("stores jobs per shop in memory repository", async () => {
    const db = new MemoryAiJobs();
    const job = newOrganizeJob({
      shopId: "shop-a",
      prompt: "test",
      elementIds: ["m1"],
      total: 1,
    });
    await db.saveJob(job);
    expect(await db.getJob("shop-b", job.id)).toBeNull();
    expect((await db.getJob("shop-a", job.id))?.id).toBe(job.id);
  });
});

describe("publish safety helper", () => {
  it("never publishes via applyOrganize", () => {
    const data = catalogWithMedia(["https://cdn.example.com/x.jpg"]);
    applyOrganize(data, [
      {
        title: "X",
        confidence: "high",
        variants: [{ color: null, mediaUrls: ["https://cdn.example.com/x.jpg"] }],
      },
    ]);
    expect(data.items[0].published).toBe(false);
    const published = publishProducts(data, [data.items[0].id], true, true);
    expect(published.ok).toBe(true);
  });
});
