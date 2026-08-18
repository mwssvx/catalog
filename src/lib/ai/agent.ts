import { aiModel, isAiConfigured } from "@/lib/ai/config";
import {
  applyMaterial,
  applyOrganize,
  applyPrice,
  applySizes,
  cardsFromMedia,
  createSection,
  highlightProducts,
  layoutByCategory,
  mergeProducts,
  missingReport,
  moveElements,
  publishProducts,
  searchItems,
  type OrganizeGroup,
} from "@/lib/ai/actions";
import type { CatalogData } from "@/lib/catalog/types";
import { promises as fs } from "node:fs";
import path from "node:path";

const TOOLS = [
  {
    type: "function",
    function: {
      name: "organize_media",
      description:
        "Group clothing photos/videos into products. Same cut/details = same product even if color differs (those are variants). Low confidence should stay separate with confidence=low. Never invent price, quantity, sizes, or material.",
      parameters: {
        type: "object",
        properties: {
          groups: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                category: {
                  type: "string",
                  enum: [
                    "tops",
                    "bottoms",
                    "outerwear",
                    "dresses",
                    "shoes",
                    "accessories",
                  ],
                },
                confidence: { type: "string", enum: ["high", "low"] },
                variants: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      color: { type: "string" },
                      mediaUrls: { type: "array", items: { type: "string" } },
                    },
                    required: ["mediaUrls"],
                  },
                },
              },
              required: ["title", "confidence", "variants"],
            },
          },
        },
        required: ["groups"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_cards_from_media",
      description: "Turn selected loose photos/videos into product cards.",
      parameters: {
        type: "object",
        properties: {
          elementIds: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_price",
      description: "Set price in som on selected or named products.",
      parameters: {
        type: "object",
        properties: {
          productIds: { type: "array", items: { type: "string" } },
          price: { type: "number" },
        },
        required: ["price"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_sizes",
      parameters: {
        type: "object",
        properties: {
          productIds: { type: "array", items: { type: "string" } },
          sizes: { type: "array", items: { type: "string" } },
        },
        required: ["sizes"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_material",
      parameters: {
        type: "object",
        properties: {
          productIds: { type: "array", items: { type: "string" } },
          material: { type: "string" },
        },
        required: ["material"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "publish_products",
      description:
        "Publish or unpublish products. Use requireComplete true to only publish items that have price, size and a photo.",
      parameters: {
        type: "object",
        properties: {
          productIds: { type: "array", items: { type: "string" } },
          published: { type: "boolean" },
          requireComplete: { type: "boolean" },
        },
        required: ["published"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_section",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          elementIds: { type: "array", items: { type: "string" } },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "layout_by_category",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "search_products",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "merge_products",
      parameters: {
        type: "object",
        properties: {
          keepId: { type: "string" },
          absorbIds: { type: "array", items: { type: "string" } },
        },
        required: ["keepId", "absorbIds"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "missing_report",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "move_elements",
      parameters: {
        type: "object",
        properties: {
          elementIds: { type: "array", items: { type: "string" } },
          x: { type: "number" },
          y: { type: "number" },
        },
        required: ["elementIds", "x", "y"],
      },
    },
  },
];

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | Array<Record<string, unknown>>;
  tool_calls?: unknown;
  tool_call_id?: string;
};

async function imageContent(url: string): Promise<Record<string, unknown> | null> {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return { type: "image_url", image_url: { url } };
  }
  if (!url.startsWith("/uploads/")) return null;
  const filePath = path.join(process.cwd(), "public", url);
  try {
    const bytes = await fs.readFile(filePath);
    const ext = path.extname(filePath).slice(1) || "jpeg";
    const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    return {
      type: "image_url",
      image_url: { url: `data:${mime};base64,${bytes.toString("base64")}` },
    };
  } catch {
    return null;
  }
}

function runTool(
  data: CatalogData,
  name: string,
  args: Record<string, unknown>,
  selectedElementIds: string[],
): string {
  const selectedProducts = data.board.elements
    .filter((element) => selectedElementIds.includes(element.id) && element.productId)
    .map((element) => element.productId!);
  const productIds = (args.productIds as string[] | undefined) ?? selectedProducts;
  const elementIds = (args.elementIds as string[] | undefined) ?? selectedElementIds;

  switch (name) {
    case "organize_media":
      return applyOrganize(data, (args.groups as OrganizeGroup[]) ?? []).summary;
    case "create_cards_from_media":
      return cardsFromMedia(data, elementIds).summary;
    case "set_price":
      return applyPrice(data, productIds, Number(args.price)).summary;
    case "set_sizes":
      return applySizes(data, productIds, (args.sizes as string[]) ?? []).summary;
    case "set_material":
      return applyMaterial(data, productIds, String(args.material ?? "")).summary;
    case "publish_products":
      return publishProducts(
        data,
        productIds.length ? productIds : data.items.map((item) => item.id),
        Boolean(args.published),
        Boolean(args.requireComplete),
      ).summary;
    case "create_section":
      return createSection(data, String(args.title ?? "Section"), elementIds).summary;
    case "layout_by_category":
      return layoutByCategory(data).summary;
    case "search_products": {
      const found = searchItems(data, String(args.query ?? ""));
      const ids = highlightProducts(
        data,
        found.map((item) => item.id),
      );
      return `Found ${found.length}: ${found.map((item) => item.code).join(", ") || "none"}. Highlighted ${ids.length}.`;
    }
    case "merge_products":
      return mergeProducts(
        data,
        String(args.keepId),
        (args.absorbIds as string[]) ?? [],
      ).summary;
    case "missing_report":
      return missingReport(data);
    case "move_elements":
      return moveElements(
        data,
        elementIds,
        Number(args.x),
        Number(args.y),
      ).summary;
    default:
      return `Unknown tool ${name}`;
  }
}

export async function runBoardAgent(options: {
  data: CatalogData;
  message: string;
  selectedElementIds: string[];
  locale: string;
}): Promise<{ reply: string; highlighted: string[] }> {
  if (!isAiConfigured()) {
    return {
      reply:
        options.locale === "ky"
          ? "AI азырынча кошулган эмес. .env.local файлына OPENAI_API_KEY жазыңыз."
          : "ИИ пока не подключен. Добавьте OPENAI_API_KEY в .env.local — без ключа доска всё равно работает вручную.",
      highlighted: [],
    };
  }

  const media = options.data.board.elements.filter(
    (element) => element.type === "media" && element.mediaUrl,
  );
  const preview = media.slice(0, 16);
  const images: Array<Record<string, unknown>> = [];
  for (const element of preview) {
    if (element.mediaKind === "video") continue;
    const content = await imageContent(element.mediaUrl!);
    if (content) images.push(content);
  }

  const catalogDigest = options.data.items
    .slice(0, 40)
    .map(
      (item) =>
        `${item.code} | ${item.title} | ${item.category ?? "-"} | ${item.price ?? "no price"} | published:${item.published} | photos:${item.photos.length}`,
    )
    .join("\n");

  const userContent: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: [
        `Locale: ${options.locale}`,
        `Seller message: ${options.message}`,
        `Selected board ids: ${options.selectedElementIds.join(", ") || "none"}`,
        `Loose media on board (${media.length}): ${media.map((element) => element.mediaUrl).join(", ")}`,
        `Products:\n${catalogDigest || "(none)"}`,
        "Act with tools. Do not invent price, quantity, sizes, or material. Color difference is a variant of the same model if the cut matches. Reply in the seller locale, short.",
      ].join("\n"),
    },
    ...images,
  ];

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are the Open Board assistant for a Dordoi clothing stall. You edit the board and product database. This is not a marketplace. WhatsApp is how customers buy. Prefer taking actions over explaining buttons.",
    },
    { role: "user", content: userContent },
  ];

  const highlighted: string[] = [];
  let reply = "";

  for (let round = 0; round < 6; round += 1) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel(),
        messages,
        tools: TOOLS,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI request failed: ${errorText.slice(0, 400)}`);
    }

    const payload = (await response.json()) as {
      choices: Array<{
        message: {
          content?: string | null;
          tool_calls?: Array<{
            id: string;
            function: { name: string; arguments: string };
          }>;
        };
      }>;
    };

    const message = payload.choices[0]?.message;
    if (!message) break;

    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push({
        role: "assistant",
        content: message.content ?? "",
        tool_calls: message.tool_calls,
      });
      for (const call of message.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}") as Record<
            string,
            unknown
          >;
        } catch {
          args = {};
        }
        const summary = runTool(
          options.data,
          call.function.name,
          args,
          options.selectedElementIds,
        );
        if (call.function.name === "search_products") {
          highlighted.push(...options.selectedElementIds);
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: summary,
        });
      }
      continue;
    }

    reply = message.content?.trim() || missingReport(options.data);
    break;
  }

  return { reply: reply || missingReport(options.data), highlighted };
}
