import { useTranslation } from "react-i18next";
import { Link } from "@/i18n/navigation";
import { CoverPhoto } from "@/components/CoverPhoto";
import { formatPrice } from "@/lib/catalog/format";
import type { Item } from "@/lib/catalog/types";

export function ItemCard({
  item,
  currencySymbol,
  href,
}: {
  item: Item;
  currencySymbol: string;
  href?: string;
}) {
  const { t } = useTranslation();
  const destination = href ?? `/item/${item.id}`;
  const statusLabel = t(`status.${item.status}`);

  return (
    <Link
      href={destination}
      className="group block overflow-hidden rounded-[24px] bg-paper-2 shadow-sm ring-1 ring-rule/60 transition duration-200 hover:-translate-y-1 hover:shadow-md"
    >
      <CoverPhoto
        src={item.photos[0]}
        alt={item.title}
        sold={item.status === "sold"}
        soldLabel={t("status.sold")}
        emptyLabel={t("form.noPhoto")}
        className="aspect-[3/4] rounded-none"
      />
      <div className="space-y-2 px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 text-[15px] font-semibold leading-snug tracking-tight">
            {item.title}
          </h2>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-olive-deep">
            {formatPrice(item.price, currencySymbol, t("item.ask"))}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(item.sizes.length > 0 ? item.sizes : [t("item.sizeUnknown")]).map(
            (size) => (
              <span
                key={size}
                className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-muted"
              >
                {size}
              </span>
            ),
          )}
          {item.status !== "in_stock" ? (
            <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-muted">
              {statusLabel}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
