import { getTranslations } from "next-intl/server";
import { CatalogFilters } from "@/components/CatalogFilters";
import { CatalogGrid } from "@/components/CatalogGrid";
import { Header } from "@/components/Header";
import { availableSizes, getShop, listItems } from "@/lib/catalog/store";
import type { Category, ItemFilters } from "@/lib/catalog/types";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    status?: string;
    category?: string;
    size?: string;
    q?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const t = await getTranslations("home");
  const params = await searchParams;
  const status = (params.status as ItemFilters["status"]) || "available";
  const category = (params.category as Category | "all") || "all";
  const size = params.size || "all";
  const q = params.q || undefined;

  const [shop, items, allItems, sizes] = await Promise.all([
    getShop(),
    listItems({ status, category, size, q, published: true }),
    listItems({ status: "all", published: true }),
    availableSizes(),
  ]);

  const availableCount = allItems.filter(
    (item) => item.status === "in_stock" || item.status === "reserved",
  ).length;

  return (
    <div className="min-h-full">
      <Header shop={shop} />
      <main className="mx-auto max-w-6xl space-y-6 px-5 py-6 sm:px-8 sm:py-8">
        <section className="rounded-[28px] bg-paper-2 px-5 py-6 shadow-sm sm:px-7">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-xl text-muted">{t("subtitle")}</p>
          <form className="mt-4">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t("search")}
              className="field max-w-md"
            />
          </form>
        </section>
        <CatalogFilters
          status={status || "available"}
          category={category}
          size={size}
          sizes={sizes}
          counts={{ all: allItems.length, available: availableCount }}
        />
        <CatalogGrid items={items} currencySymbol={shop.currencySymbol} />
      </main>
    </div>
  );
}
