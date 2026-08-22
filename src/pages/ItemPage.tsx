import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CoverPhoto } from "@/components/CoverPhoto";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import {
  WhatsAppButton,
  buildWhatsAppMessage,
} from "@/components/WhatsAppButton";
import { Link, useParams } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/catalog/format";
import type { Item, Shop } from "@/lib/catalog/types";

export function ItemPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const [shopRes, itemRes] = await Promise.all([
          api<{ shop: Shop }>("/api/v1/shop"),
          api<{ item: Item }>(`/api/v1/items/${id}`),
        ]);
        if (cancelled) return;
        const next = itemRes.item;
        if (!next || next.status === "hidden" || !next.published) {
          setMissing(true);
          return;
        }
        setShop(shopRes.shop as Shop);
        setItem(next);
      } catch {
        if (!cancelled) setMissing(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (missing) {
    return (
      <div className="space-y-4 p-8">
        <p className="text-muted">{t("item.unpublishedHidden")}</p>
        <Link href="/" className="text-sm font-medium text-olive hover:underline">
          {t("item.back")}
        </Link>
      </div>
    );
  }
  if (!shop || !item) {
    return <p className="p-8 text-muted">{t("common.loading")}</p>;
  }

  const ask = t("item.ask");
  const message = buildWhatsAppMessage(
    t("item.whatsappMessage"),
    item,
    shop,
    ask,
  );
  const wholesale =
    item.wholesalePrice != null
      ? [
          formatPrice(item.wholesalePrice, shop.currencySymbol, ask),
          item.minWholesaleQty != null
            ? t("item.wholesaleFrom", { count: item.minWholesaleQty })
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <div className="flex min-h-full flex-col pb-24 sm:pb-0">
      <Header shop={shop} />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-5 py-6 lg:grid-cols-[1.05fr_0.95fr] sm:px-8 sm:py-8">
        <div className="space-y-3">
          {(item.photos.length > 0 ? item.photos : [undefined]).map(
            (src, index) => (
              <CoverPhoto
                key={src ?? index}
                src={src}
                alt={item.title}
                sold={item.status === "sold"}
                soldLabel={t("status.sold")}
                emptyLabel={t("form.noPhoto")}
                priority={index === 0}
                className="aspect-square max-h-[70vh] w-full shadow-sm"
              />
            ),
          )}
          {item.videos.map((src) => (
            <video
              key={src}
              src={src}
              controls
              preload="metadata"
              className="w-full rounded-[22px] shadow-sm"
            />
          ))}
        </div>
        <div className="rounded-[28px] bg-paper-2 p-6 shadow-sm lg:self-start">
          <Link href="/" className="btn btn-secondary min-h-10 text-sm">
            {t("item.back")}
          </Link>
          <p className="mt-5 text-sm font-medium text-muted">
            {item.code} ·{" "}
            {item.category
              ? t(`category.${item.category}`)
              : t("category.unsorted")}
            {" · "}
            {t(`status.${item.status}`)}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {item.title}
          </h1>
          <p className="mt-3 text-2xl font-semibold">
            {formatPrice(item.price, shop.currencySymbol, ask)}
          </p>
          {item.description ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink">
              {item.description}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            {(item.sizes.length > 0 ? item.sizes : [ask]).map((size) => (
              <span
                key={size}
                className="rounded-[12px] bg-paper px-3 py-2 text-sm font-medium"
              >
                {size}
              </span>
            ))}
            {item.variants
              .map((variant) => variant.color)
              .filter(Boolean)
              .map((color) => (
                <span
                  key={color}
                  className="rounded-[12px] bg-paper px-3 py-2 text-sm font-medium"
                >
                  {color}
                </span>
              ))}
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <Row
              label={t("item.quantity")}
              value={
                item.quantity == null
                  ? ask
                  : t("item.left", { count: item.quantity })
              }
            />
            <Row label={t("item.material")} value={item.material || ask} />
            <Row
              label={t("item.condition")}
              value={
                item.condition
                  ? t(`condition.${item.condition}`)
                  : t("condition.unset")
              }
            />
            <Row label={t("item.code")} value={item.code} />
            {wholesale ? (
              <Row label={t("item.wholesale")} value={wholesale} />
            ) : null}
            {item.origin ? (
              <Row label={t("item.origin")} value={item.origin} />
            ) : null}
          </dl>
          {item.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-[10px] bg-paper px-2 py-1 text-xs font-medium text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          {item.status !== "sold" ? (
            <div className="mt-6 hidden sm:block">
              <WhatsAppButton
                shop={shop}
                label={t("item.whatsapp")}
                hint={t("item.whatsappHint")}
                message={message}
                missingLabel={t("item.contactUnset")}
              />
            </div>
          ) : null}
          {item.notes ? (
            <div className="mt-6 rounded-[20px] bg-paper p-4">
              <p className="text-xs font-medium text-muted">
                {t("item.sellerNote")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{item.notes}</p>
            </div>
          ) : null}
        </div>
      </main>
      {item.status !== "sold" ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper-2/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
          <WhatsAppButton
            shop={shop}
            label={t("item.whatsapp")}
            hint={t("item.whatsappHint")}
            message={message}
            missingLabel={t("item.contactUnset")}
            compact
          />
        </div>
      ) : null}
      <Footer shop={shop} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-paper px-3 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
