import { getTranslations } from "next-intl/server";
import { CatalogGrid } from "@/components/CatalogGrid";
import { Header } from "@/components/Header";
import { LogoutButton } from "@/components/studio/LogoutButton";
import { Link } from "@/i18n/navigation";
import { getShop, listItems } from "@/lib/catalog/store";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const t = await getTranslations("studio");
  const [shop, items] = await Promise.all([
    getShop(),
    listItems({ status: "all" }),
  ]);

  const inStock = items.filter((item) => item.status === "in_stock").length;

  return (
    <div className="min-h-full">
      <Header shop={shop} studio />
      <main className="mx-auto max-w-6xl space-y-6 px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-paper-2 px-5 py-5 shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="mt-1 text-muted">
              {t("counts", { inStock, total: items.length })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/studio/board"
              className="rounded-[14px] bg-ink px-4 py-2 text-sm font-medium text-white"
            >
              {t("openBoard")}
            </Link>
            <LogoutButton />
          </div>
        </div>
        <p className="text-sm text-muted">{t("openBoardHint")}</p>
        <CatalogGrid
          items={items}
          currencySymbol={shop.currencySymbol}
          hrefFor={(item) => `/studio/items/${item.id}`}
        />
      </main>
    </div>
  );
}
