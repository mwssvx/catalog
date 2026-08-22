import {
  CATEGORIES,
  type Category,
  type Condition,
} from "@/lib/catalog/types";

export type ParsedNotes = {
  title: string;
  price: number | null;
  sizes: string[];
  quantity: number | null;
  material: string | null;
  category: Category | null;
  condition: Condition | null;
};

const SIZE_ALIASES: Record<string, string> = {
  xxs: "XXS",
  xs: "XS",
  s: "S",
  m: "M",
  l: "L",
  xl: "XL",
  xxl: "XXL",
  xxxl: "XXXL",
  "2xl": "XXL",
  "3xl": "XXXL",
};

const SIZE_PATTERN =
  /\b(xxxs|xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|free\s*size|one\s*size|оверсайз|oversize|\d{2})\b/gi;

const CATEGORY_WORDS: Record<Category, string[]> = {
  tops: [
    "shirt",
    "tee",
    "t-shirt",
    "top",
    "blouse",
    "sweater",
    "hoodie",
    "knit",
    "polo",
    "tank",
    "рубашк",
    "футболк",
    "кофт",
    "худи",
    "свитер",
    "блузк",
    "майк",
    "көйнөк",
    "футболка",
  ],
  bottoms: [
    "pant",
    "pants",
    "jean",
    "jeans",
    "trouser",
    "short",
    "shorts",
    "skirt",
    "джинсы",
    "джинс",
    "брюк",
    "штаны",
    "юбк",
    "шорты",
    "шым",
    "юбка",
  ],
  outerwear: [
    "jacket",
    "coat",
    "blazer",
    "parka",
    "cardigan",
    "куртк",
    "пальто",
    "плащ",
    "пиджак",
    "ветровк",
    "куртка",
  ],
  dresses: ["dress", "gown", "плать", "сарафан", "көйнөк"],
  shoes: [
    "shoe",
    "shoes",
    "sneaker",
    "boot",
    "sandal",
    "обувь",
    "кроссовк",
    "ботин",
    "туфл",
    "сандал",
    "бут кийим",
    "кеды",
  ],
  accessories: [
    "bag",
    "belt",
    "hat",
    "cap",
    "scarf",
    "сумк",
    "ремень",
    "шапк",
    "шарф",
    "очк",
    "сумка",
  ],
};

const CONDITION_PHRASES: Array<[RegExp, Condition]> = [
  [/\blike[\s-]?new\b/i, "like-new"],
  [/\balmost[\s-]?new\b/i, "like-new"],
  [/почти\s*нов/i, "like-new"],
  [/дээрил(?:ик)?\s*жаңы/i, "like-new"],
  [/\bbrand[\s-]?new\b/i, "new"],
  [/\bnew\b/i, "new"],
  [/\bнов(ое|ый|ая|ые)\b/i, "new"],
  [/\bжаңы\b/i, "new"],
  [/\bworn\b/i, "worn"],
  [/ношен/i, "worn"],
  [/б\/у/i, "worn"],
  [/кийилген/i, "worn"],
  [/\bgood\b/i, "good"],
  [/\bused\b/i, "good"],
  [/хорош/i, "good"],
  [/жакшы/i, "good"],
];

const MATERIAL_WORDS: Array<[RegExp, string]> = [
  [/\bcotton\b|\bхлопок\b|\bхлопк|\bпахта\b/i, "хлопок"],
  [/\blinen\b|\bлён\b|\bлен\b/i, "лён"],
  [/\bwool\b|\bшерсть\b|\bжүн\b/i, "шерсть"],
  [/\bleather\b|\bкожа\b|\bтери\b/i, "кожа"],
  [/\bdenim\b|\bденим\b/i, "деним"],
  [/\bpolyester\b|\bполиэстер\b/i, "полиэстер"],
  [/\bviscose\b|\bвискоза\b/i, "вискоза"],
  [/\bsilk\b|\bшелк\b|\bжибек\b/i, "шёлк"],
];

function extractQuantity(text: string): { quantity: number | null; rest: string } {
  const labeled =
    /(?:осталось|осталось:|кол-во|количество|канча\s*калды|калды|калып)\s*[:-]?\s*(\d{1,4})|(\d{1,4})\s*(?:шт|штук[аи]?|калып|калды|pcs|pieces|left)/i.exec(
      text,
    );

  if (labeled) {
    const raw = labeled[1] ?? labeled[2] ?? "";
    const quantity = Number(raw);
    return {
      quantity: Number.isFinite(quantity) ? quantity : null,
      rest: text.replace(labeled[0], " "),
    };
  }

  return { quantity: null, rest: text };
}

function extractPrice(text: string): { price: number | null; rest: string } {
  const labeled =
    /(?:сом|cом|som|kgs|₸|৳|tk|\$)\s*([\d\s,]+(?:\.\d+)?)|([\d\s,]+(?:\.\d+)?)\s*(?:сом|cом|som|kgs|₸)/i.exec(
      text,
    );

  if (labeled) {
    const raw = (labeled[1] ?? labeled[2] ?? "").replace(/\s/g, "").replace(/,/g, "");
    const price = Number(raw);
    return {
      price: Number.isFinite(price) ? price : null,
      rest: text.replace(labeled[0], " "),
    };
  }

  const bare = text.match(/\b(\d{3,6})(?:\.\d{1,2})?\b/g);
  if (bare && bare.length === 1) {
    const price = Number(bare[0].replace(/,/g, ""));
    return {
      price: Number.isFinite(price) ? price : null,
      rest: text.replace(bare[0], " "),
    };
  }

  return { price: null, rest: text };
}

function extractSizes(text: string): { sizes: string[]; rest: string } {
  const sizes: string[] = [];
  const rest = text.replace(SIZE_PATTERN, (match) => {
    const key = match.replace(/\s+/g, "").toLowerCase();
    if (key === "freesize" || key === "onesize" || key === "оверсайз" || key === "oversize") {
      sizes.push("Free");
      return " ";
    }
    if (/^\d{2}$/.test(key)) {
      sizes.push(key);
      return " ";
    }
    sizes.push(SIZE_ALIASES[key] ?? match.toUpperCase());
    return " ";
  });

  return { sizes: [...new Set(sizes)], rest };
}

function extractCondition(text: string): {
  condition: Condition | null;
  rest: string;
} {
  for (const [pattern, condition] of CONDITION_PHRASES) {
    if (pattern.test(text)) {
      return { condition, rest: text.replace(pattern, " ") };
    }
  }
  return { condition: null, rest: text };
}

function extractMaterial(text: string): { material: string | null; rest: string } {
  for (const [pattern, material] of MATERIAL_WORDS) {
    const match = pattern.exec(text);
    if (match) {
      return { material, rest: text.replace(match[0], " ") };
    }
  }
  return { material: null, rest: text };
}

function extractCategory(text: string): Category | null {
  const lower = text.toLowerCase();
  for (const category of CATEGORIES) {
    if (CATEGORY_WORDS[category].some((word) => lower.includes(word))) {
      return category;
    }
  }
  return null;
}

function cleanTitle(text: string): string {
  const firstLine = text.split("\n")[0] ?? text;
  const collapsed = firstLine
    .replace(/[|/]+/g, " ")
    .replace(/[,;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[-–—]+|[-–—]+$/g, "")
    .trim();

  if (!collapsed) return "";

  return collapsed.charAt(0).toUpperCase() + collapsed.slice(1);
}

export function parseNotes(notes: string): ParsedNotes {
  const trimmed = notes.trim();
  if (!trimmed) {
    return {
      title: "",
      price: null,
      sizes: [],
      quantity: null,
      material: null,
      category: null,
      condition: null,
    };
  }

  const counted = extractQuantity(trimmed);
  const priced = extractPrice(counted.rest);
  const sized = extractSizes(priced.rest);
  const materialed = extractMaterial(sized.rest);
  const conditioned = extractCondition(materialed.rest);
  const category = extractCategory(trimmed);
  const title = cleanTitle(conditioned.rest);

  return {
    title,
    price: priced.price,
    sizes: sized.sizes,
    quantity: counted.quantity,
    material: materialed.material,
    category,
    condition: conditioned.condition,
  };
}
