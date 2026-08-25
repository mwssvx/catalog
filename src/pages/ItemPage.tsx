import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CoverPhoto } from "@/components/CoverPhoto";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ContactLinks } from "@/components/ContactLinks";
import { buildWhatsAppMessage } from "@/components/WhatsAppButton";
import { Link, useParams } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { categoryLabel, formatPrice } from "@/lib/catalog/format";
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
        <Link href="/" className="text-sm font-medium text-olive-deep hover:underline">
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
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-5 py-6 lg:grid-cols-[1.05fr_0.95fr] sm:px-8 sm:py-10">
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
                className="aspect-[4/5] max-h-[75vh] w-full rounded-[28px] shadow-sm ring-1 ring-rule/50"
              />
            ),
          )}
          {item.videos.map((src) => (
            <video
              key={src}
              src={src}
              controls
              preload="metadata"
              className="w-full rounded-[28px] shadow-sm ring-1 ring-rule/50"
            />
          ))}
        </div>
        <div className="rounded-[28px] bg-paper-2 p-6 shadow-sm ring-1 ring-rule/50 lg:sticky lg:top-28 lg:self-start sm:p-8">
          <Link href="/" className="btn btn-secondary min-h-10 text-sm">
            {t("item.back")}
          </Link>
          <p className="mt-6 text-sm font-medium text-muted">
            {categoryLabel(item.category, t)}
            {" · "}
            {t(`status.${item.status}`)}
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {item.title}
          </h1>
          <p className="mt-3 text-2xl font-semibold text-olive-deep">
            {formatPrice(item.price, shop.currencySymbol, ask)}
          </p>
          {item.description ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {item.description}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            {(item.sizes.length > 0 ? item.sizes : [ask]).map((size) => (
              <span
                key={size}
                className="rounded-full bg-paper px-3.5 py-2 text-sm font-medium"
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
                  className="rounded-full bg-paper px-3.5 py-2 text-sm font-medium"
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
                  className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          {item.status !== "sold" ? (
            <div className="mt-8 hidden space-y-3 sm:block">
              <ContactLinks shop={shop} whatsappMessage={message} />
              <p className="text-center text-xs text-muted">
                {t("item.whatsappHint")}
              </p>
            </div>
          ) : null}
          {item.notes ? (
            <div className="mt-6 rounded-[20px] bg-sage/40 p-4">
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
          <ContactLinks shop={shop} whatsappMessage={message} compact />
        </div>
      ) : null}
      <Footer shop={shop} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-paper px-3.5 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
