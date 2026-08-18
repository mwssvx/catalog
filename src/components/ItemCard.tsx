import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverPhoto } from "@/components/CoverPhoto";
import { formatPrice } from "@/lib/catalog/format";
import type { Item } from "@/lib/catalog/types";

export async function ItemCard({
  item,
  currencySymbol,
  href,
}: {
  item: Item;
  currencySymbol: string;
  href?: string;
}) {
  const t = await getTranslations();
  const destination = href ?? `/item/${item.id}`;
  const statusLabel = t(`status.${item.status}`);

  return (
    <Link
      href={destination}
      className="group block rounded-[28px] bg-paper-2 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <CoverPhoto
        src={item.photos[0]}
        alt={item.title}
        sold={item.status === "sold"}
        soldLabel={t("status.sold")}
        emptyLabel={t("form.noPhoto")}
        className="aspect-square"
      />
      <div className="space-y-2 px-1 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-olive">{item.code}</p>
            <h2 className="text-[15px] font-semibold leading-snug">{item.title}</h2>
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums">
            {formatPrice(item.price, currencySymbol, t("item.ask"))}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(item.sizes.length > 0 ? item.sizes : [t("item.sizeUnknown")]).map((size) => (
            <span
              key={size}
              className="rounded-[10px] bg-paper px-2 py-1 text-xs font-medium text-muted"
            >
              {size}
            </span>
          ))}
          {item.quantity != null ? (
            <span className="rounded-[10px] bg-paper px-2 py-1 text-xs font-medium text-muted">
              {t("item.left", { count: item.quantity })}
            </span>
          ) : null}
          {item.material ? (
            <span className="rounded-[10px] bg-paper px-2 py-1 text-xs font-medium text-muted">
              {item.material}
            </span>
          ) : null}
          {item.status !== "in_stock" ? (
            <span className="rounded-[10px] bg-paper px-2 py-1 text-xs font-medium text-muted">
              {statusLabel}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
