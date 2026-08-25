import { useTranslation } from "react-i18next";
import { ItemCard } from "@/components/ItemCard";
import { ContactLinks } from "@/components/ContactLinks";
import type { Item, Shop } from "@/lib/catalog/types";

export function CatalogGrid({
  items,
  currencySymbol,
  shop,
  hrefFor,
}: {
  items: Item[];
  currencySymbol: string;
  shop?: Shop;
  hrefFor?: (item: Item) => string;
}) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-rule bg-paper-2 px-6 py-12 text-center shadow-sm">
        <p className="text-lg font-semibold text-ink">{t("home.emptyTitle")}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          {t("home.empty")}
        </p>
        {shop ? (
          <div className="mt-5 flex justify-center">
            <ContactLinks
              shop={shop}
              whatsappMessage={t("home.whatsappMessage", { shop: shop.name })}
              compact
            />
          </div>
        ) : null}
      </div>
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
