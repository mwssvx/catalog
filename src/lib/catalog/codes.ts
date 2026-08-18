import type { Category, Item } from "@/lib/catalog/types";

const PREFIX: Record<Category, string> = {
  dresses: "D",
  outerwear: "J",
  tops: "T",
  bottoms: "B",
  shoes: "S",
  accessories: "A",
};

export function nextProductCode(
  items: Item[],
  category: Category | null,
): string {
  const prefix = category ? PREFIX[category] : "P";
  const nums = items
    .map((item) => item.code)
    .filter((code): code is string => Boolean(code?.startsWith(prefix)))
    .map((code) => Number.parseInt(code.slice(prefix.length), 10))
    .filter((value) => Number.isFinite(value));
  const next = (nums.length > 0 ? Math.max(...nums) : 100) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export function flattenMedia(item: Item): { photos: string[]; videos: string[] } {
  const photos = [
    ...item.photos,
    ...item.variants.flatMap((variant) => variant.photos),
  ];
  const videos = [
    ...item.videos,
    ...item.variants.flatMap((variant) => variant.videos),
  ];
  return {
    photos: [...new Set(photos.filter(Boolean))],
    videos: [...new Set(videos.filter(Boolean))],
  };
}
