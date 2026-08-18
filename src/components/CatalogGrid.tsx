import { getTranslations } from "next-intl/server";
import { ItemCard } from "@/components/ItemCard";
import type { Item } from "@/lib/catalog/types";

export async function CatalogGrid({
  items,
  currencySymbol,
  hrefFor,
}: {
  items: Item[];
  currencySymbol: string;
  hrefFor?: (item: Item) => string;
}) {
  const t = await getTranslations("home");

  if (items.length === 0) {
    return (
      <p className="rounded-[28px] border border-dashed border-rule bg-paper-2 px-6 py-16 text-center text-muted">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          currencySymbol={currencySymbol}
          href={hrefFor?.(item)}
        />
      ))}
    </div>
  );
}
