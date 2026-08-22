/**
 * Evaluation fixture format for real labeled shop photos.
 * JSON fixtures in this folder should match `AiEvalFixture`.
 */

export type AiEvalFixture = {
  id: string;
  description: string;
  locale: "ru" | "ky";
  media: Array<{
    path: string;
    kind: "image" | "video";
    framePath?: string;
    labels: {
      isClothing: boolean;
      isPersonalOrUnrelated: boolean;
      clothingType?: string;
      visibleColor?: string;
      productModelId: string;
      colorVariantId: string;
      duplicateOf?: string;
    };
  }>;
  expected: {
    productCount: number;
    unrelated: string[];
    mustSeparate: Array<[string, string]>;
    mustMergeModels: Array<[string, string]>;
  };
  scoring: {
    preferSeparate: true;
    neverInfer: Array<"price" | "size" | "quantity" | "origin" | "material">;
  };
};

export const exampleAiEvalFixture: AiEvalFixture = {
  id: "example-mixed-rack",
  description: "Two shirt colors + one unrelated selfie",
  locale: "ru",
  media: [
    {
      path: "samples/shirt-blue-front.jpg",
      kind: "image",
      labels: {
        isClothing: true,
        isPersonalOrUnrelated: false,
        clothingType: "shirt",
        visibleColor: "blue",
        productModelId: "shirt-a",
        colorVariantId: "shirt-a-blue",
      },
    },
    {
      path: "samples/shirt-red-front.jpg",
      kind: "image",
      labels: {
        isClothing: true,
        isPersonalOrUnrelated: false,
        clothingType: "shirt",
        visibleColor: "red",
        productModelId: "shirt-a",
        colorVariantId: "shirt-a-red",
      },
    },
    {
      path: "samples/selfie.jpg",
      kind: "image",
      labels: {
        isClothing: false,
        isPersonalOrUnrelated: true,
        productModelId: "unrelated",
        colorVariantId: "unrelated",
      },
    },
  ],
  expected: {
    productCount: 1,
    unrelated: ["samples/selfie.jpg"],
    mustSeparate: [],
    mustMergeModels: [
      ["samples/shirt-blue-front.jpg", "samples/shirt-red-front.jpg"],
    ],
  },
  scoring: {
    preferSeparate: true,
    neverInfer: ["price", "size", "quantity", "origin", "material"],
  },
};
