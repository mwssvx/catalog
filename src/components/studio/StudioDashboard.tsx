import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@/i18n/navigation";
import { whatsappHref, isPlaceholderWhatsapp } from "@/lib/catalog/format";
import { weekStudioStats } from "@/lib/catalog/studio-actions";
import type { Item, Shop } from "@/lib/catalog/types";

export function StudioDashboard({
  shop,
  items,
}: {
  shop: Shop;
  items: Item[];
}) {
  const { t } = useTranslation();
  const stats = useMemo(() => weekStudioStats(items), [items]);
  const whatsappOk = !isPlaceholderWhatsapp(shop.whatsapp);

  const totals = [
    { label: t("studio.statInStock"), value: stats.inStock },
    { label: t("studio.statPublished"), value: stats.published },
    { label: t("studio.statDrafts"), value: stats.drafts },
    { label: t("studio.statSold"), value: stats.sold },
  ];

  const week = [
    {
      label: t("studio.weekPublished"),
      value: stats.publishedThisWeek,
    },
    { label: t("studio.weekSold"), value: stats.soldThisWeek },
    { label: t("studio.weekDrafts"), value: stats.draftsThisWeek },
  ];

  return (
    <section className="space-y-4">
      <div className="rounded-[28px] bg-paper-2 px-5 py-6 shadow-sm sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-olive">
          {t("studio.adminBadge")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("studio.adminTitle")}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">{t("studio.adminHelp")}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/studio/new" className="btn btn-primary">
            {t("header.addItem")}
          </Link>
          <Link href="/" className="btn btn-secondary">
            {t("header.catalog")}
          </Link>
          <Link href="/studio/settings" className="btn btn-secondary">
            {t("header.settings")}
          </Link>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          {t("studio.weekTitle")}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {week.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[22px] bg-paper-2 px-4 py-4 shadow-sm"
            >
              <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
              <p className="mt-1 text-xs font-medium text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {totals.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[22px] bg-paper-2 px-4 py-4 shadow-sm"
          >
            <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
            <p className="mt-1 text-xs font-medium text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {!whatsappOk ? (
        <div className="rounded-[20px] border border-sold/30 bg-paper-2 px-4 py-3 text-sm shadow-sm">
          <p className="font-medium text-sold">{t("studio.warnWhatsapp")}</p>
          <Link
            href="/studio/settings"
            className="mt-1 inline-block font-medium text-olive hover:underline"
          >
            {t("studio.fixSettings")}
          </Link>
        </div>
      ) : (
        <a
          href={
            whatsappHref(
              shop.whatsapp,
              t("studio.whatsappTestMessage", { shop: shop.name }),
            ) ?? undefined
          }
          target="_blank"
          rel="noreferrer"
          className="btn btn-whatsapp"
        >
          {t("studio.whatsappTest")}
        </a>
      )}
    </section>
  );
}
