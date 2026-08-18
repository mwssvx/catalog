import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { CoverPhoto } from "@/components/CoverPhoto";
import { Header } from "@/components/Header";
import { WhatsAppButton, buildWhatsAppMessage } from "@/components/WhatsAppButton";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/catalog/format";
import { getItem, getShop } from "@/lib/catalog/store";

export const dynamic = "force-dynamic";

type ItemPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ItemPage({ params }: ItemPageProps) {
  const t = await getTranslations();
  const { id } = await params;
  const [shop, item] = await Promise.all([getShop(), getItem(id)]);
  if (!item || item.status === "hidden" || !item.published) notFound();

  const ask = t("item.ask");
  const message = buildWhatsAppMessage(
    t("item.whatsappMessage"),
    item,
    shop,
    ask,
  );

  return (
    <div className="min-h-full">
      <Header shop={shop} />
      <main className="mx-auto grid max-w-6xl gap-4 px-5 py-6 lg:grid-cols-[1.05fr_0.95fr] sm:px-8 sm:py-8">
        <div className="space-y-3">
          {(item.photos.length > 0 ? item.photos : [undefined]).map((src, index) => (
            <CoverPhoto
              key={src ?? index}
              src={src}
              alt={item.title}
              sold={item.status === "sold"}
              soldLabel={t("status.sold")}
              emptyLabel={t("form.noPhoto")}
              className="aspect-square max-h-[70vh] w-full shadow-sm"
            />
          ))}
          {item.videos.map((src) => (
            <video
              key={src}
              src={src}
              controls
              className="w-full rounded-[22px] shadow-sm"
            />
          ))}
        </div>
        <div className="rounded-[28px] bg-paper-2 p-6 shadow-sm lg:self-start">
          <Link
            href="/"
            className="inline-flex rounded-[12px] bg-paper px-3 py-1.5 text-sm font-medium text-muted hover:text-ink"
          >
            {t("item.back")}
          </Link>
          <p className="mt-5 text-sm font-medium text-muted">
            {item.code} ·{" "}
            {item.category ? t(`category.${item.category}`) : t("category.unsorted")}
            {" · "}
            {t(`status.${item.status}`)}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{item.title}</h1>
          <p className="mt-3 text-2xl font-semibold">
            {formatPrice(item.price, shop.currencySymbol, ask)}
          </p>
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
                item.quantity == null ? ask : t("item.left", { count: item.quantity })
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
          </dl>
          {item.status !== "sold" ? (
            <WhatsAppButton
              shop={shop}
              label={t("item.whatsapp")}
              hint={t("item.whatsappHint")}
              message={message}
            />
          ) : null}
          {item.notes ? (
            <div className="mt-6 rounded-[20px] bg-paper p-4">
              <p className="text-xs font-medium text-muted">{t("item.sellerNote")}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{item.notes}</p>
            </div>
          ) : null}
        </div>
      </main>
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
