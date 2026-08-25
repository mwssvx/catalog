import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { CatalogFilters } from "@/components/CatalogFilters";
import { CatalogGrid } from "@/components/CatalogGrid";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ContactLinks } from "@/components/ContactLinks";
import { api } from "@/lib/api";
import { categoryLabel } from "@/lib/catalog/format";
import { DEFAULT_SHOP_CATEGORIES } from "@/lib/catalog/types";
import type { Category, Item, ItemFilters, Shop } from "@/lib/catalog/types";

type HomeData = {
  key: string;
  shop: Shop;
  items: Item[];
  allItems: Item[];
  sizes: string[];
};

export function HomePage() {
  const { t } = useTranslation("translation");
  const [searchParams, setSearchParams] = useSearchParams();
  const status =
    (searchParams.get("status") as ItemFilters["status"]) || "available";
  const category = (searchParams.get("category") as Category | "all") || "all";
  const size = searchParams.get("size") || "all";
  const q = searchParams.get("q") || undefined;
  const [reloadKey, setReloadKey] = useState(0);
  const queryKey = `${status}|${category}|${size}|${q ?? ""}|${reloadKey}`;

  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const params = new URLSearchParams({
          status: status || "available",
          category,
          size,
          published: "true",
        });
        if (q) params.set("q", q);
        const [shopRes, itemsRes, allRes, sizesRes] = await Promise.all([
          api<{ shop: Shop }>("/api/v1/shop"),
          api<{ items: Item[] }>(`/api/v1/items?${params}`),
          api<{ items: Item[] }>("/api/v1/items?status=all&published=true"),
          api<{ sizes: string[] }>("/api/v1/meta/sizes"),
        ]);
        if (cancelled) return;
        setError("");
        setData({
          key: queryKey,
          shop: shopRes.shop as Shop,
          items: itemsRes.items,
          allItems: allRes.items,
          sizes: sizesRes.sizes,
        });
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, category, size, q, reloadKey, queryKey]);

  const shop = data?.shop ?? null;
  const loading = !error && data?.key !== queryKey;
  const items = loading ? [] : (data?.items ?? []);
  const allItems = data?.allItems ?? [];
  const sizes = data?.sizes ?? [];

  if (error && !shop) {
    return (
      <div className="space-y-4 p-8">
        <p className="text-sold">{error}</p>
        <button
          type="button"
          className="btn btn-primary min-h-11"
          onClick={() => setReloadKey((n) => n + 1)}
        >
          {t("studio.retry")}
        </button>
      </div>
    );
  }
  if (!shop) {
    return <p className="p-8 text-muted">{t("common.loading")}</p>;
  }

  const availableCount = allItems.filter(
    (item) => item.status === "in_stock" || item.status === "reserved",
  ).length;
  const categories =
    shop.categories?.length > 0 ? shop.categories : DEFAULT_SHOP_CATEGORIES;
  const brandName = shop.name?.trim() || "Velviera";

  function setCategory(next: string) {
    const params = new URLSearchParams(searchParams);
    if (next && next !== "all") params.set("category", next);
    else params.delete("category");
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header shop={shop} />
      <section className="relative min-h-[78vh] w-full overflow-hidden sm:min-h-[85vh]">
        {shop.coverUrl ? (
          <img
            src={shop.coverUrl}
            alt=""
            loading="eager"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #f7e4df 0%, #f7f1ea 45%, #e8d5ce 100%)",
            }}
          />
        )}
        <div className="hero-veil absolute inset-0" />
        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-5 pb-12 pt-28 sm:min-h-[85vh] sm:justify-center sm:px-8 sm:pb-20 sm:pt-24">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-olive-deep sm:text-olive">
            {shop.location || t("home.locationFallback")}
          </p>
          <h1 className="font-display mt-3 text-5xl font-semibold tracking-tight text-ink sm:text-7xl">
            {brandName}
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
            {shop.tagline?.trim() || t("home.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#catalog" className="btn btn-primary min-h-12 px-6">
              {t("home.explore")}
            </a>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-10 px-5 py-10 sm:px-8 sm:py-14">
        {error ? (
          <div className="flex flex-wrap items-center gap-3 rounded-[20px] bg-paper-2 px-4 py-3 text-sm shadow-sm">
            <p className="text-sold">{error}</p>
            <button
              type="button"
              className="btn btn-primary min-h-11"
              onClick={() => setReloadKey((n) => n + 1)}
            >
              {t("studio.retry")}
            </button>
          </div>
        ) : null}

        <section className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-olive">
              {t("home.shopByCategory")}
            </p>
            <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight">
              {t("home.categoriesTitle")}
            </h2>
          </div>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={`flex w-24 shrink-0 flex-col items-center gap-2 ${
                category === "all" ? "opacity-100" : "opacity-80 hover:opacity-100"
              }`}
            >
              <span
                className={`grid size-20 place-items-center rounded-full border text-sm font-semibold ${
                  category === "all"
                    ? "border-olive-deep bg-olive-deep text-white"
                    : "border-rule bg-paper-2 text-ink"
                }`}
              >
                {t("home.allKindsShort")}
              </span>
              <span className="text-center text-xs font-medium text-muted">
                {t("home.allKinds")}
              </span>
            </button>
            {categories.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={`flex w-24 shrink-0 flex-col items-center gap-2 ${
                  category === value
                    ? "opacity-100"
                    : "opacity-80 hover:opacity-100"
                }`}
              >
                <span
                  className={`grid size-20 place-items-center rounded-full border text-center text-[11px] font-semibold leading-tight ${
                    category === value
                      ? "border-olive-deep bg-olive-deep text-white"
                      : "border-rule bg-sage/50 text-ink"
                  }`}
                >
                  {categoryLabel(value, t)}
                </span>
                <span className="line-clamp-2 text-center text-xs font-medium text-muted">
                  {categoryLabel(value, t)}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section id="catalog" className="scroll-mt-28 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-olive">
                {t("home.catalogEyebrow")}
              </p>
              <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight">
                {t("home.catalogTitle")}
              </h2>
            </div>
            <form
              className="flex w-full flex-col gap-2 sm:max-w-md sm:flex-row sm:items-center"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const next = new URLSearchParams(searchParams);
                const query = String(form.get("q") || "").trim();
                if (query) next.set("q", query);
                else next.delete("q");
                setSearchParams(next);
              }}
            >
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder={t("home.search")}
                className="field min-h-11 flex-1"
              />
              <button type="submit" className="btn btn-secondary min-h-11">
                {t("home.searchAction")}
              </button>
            </form>
          </div>

          <CatalogFilters
            status={status || "available"}
            category={category}
            size={size}
            q={q}
            sizes={sizes}
            categories={categories}
            counts={{ all: allItems.length, available: availableCount }}
            hideCategories
          />

          {loading ? (
            <p className="text-muted">{t("common.loading")}</p>
          ) : (
            <CatalogGrid
              items={items}
              currencySymbol={shop.currencySymbol}
              shop={shop}
            />
          )}
        </section>

        <section className="rounded-[28px] bg-sage/40 px-5 py-8 sm:px-8">
          <p className="font-display text-2xl font-semibold tracking-tight text-ink">
            {t("home.contactTitle")}
          </p>
          <p className="mt-2 max-w-lg text-sm text-muted">{t("home.contactHelp")}</p>
          <div className="mt-5">
            <ContactLinks
              shop={shop}
              whatsappMessage={t("home.whatsappMessage", { shop: brandName })}
            />
          </div>
        </section>
      </main>
      <Footer shop={shop} />
    </div>
  );
}
