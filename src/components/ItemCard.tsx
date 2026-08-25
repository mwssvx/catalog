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

  return (
    <Link href={destination} className="group block">
      <CoverPhoto
        src={item.photos[0]}
        alt={item.title}
        sold={item.status === "sold"}
        soldLabel={t("status.sold")}
        emptyLabel={t("form.noPhoto")}
        className="aspect-[3/4] rounded-[1.35rem] bg-[#efe6df] shadow-sm ring-1 ring-rule/50 transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md"
      />
      <div className="mt-3 space-y-1 px-0.5">
        <h2 className="text-[0.95rem] font-medium leading-snug tracking-tight text-ink">
          {item.title}
        </h2>
        <p className="text-sm tabular-nums text-muted">
          {formatPrice(item.price, currencySymbol, t("item.ask"))}
        </p>
        {item.status !== "in_stock" && item.status !== "reserved" ? (
          <p className="text-xs text-muted">{t(`status.${item.status}`)}</p>
        ) : null}
      </div>
    </Link>
  );
}
