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

/** Soft lifestyle fallbacks when a category has no product photos yet. */
const CATEGORY_FALLBACK: Record<string, string> = {
  sets: "https://images.unsplash.com/photo-1617331140180-e8262094733a?auto=format&fit=crop&w=600&q=80",
  nightdresses:
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80",
  robes:
    "https://images.unsplash.com/photo-1618556450991-2f1af64e8191?auto=format&fit=crop&w=600&q=80",
  loungewear:
    "https://images.unsplash.com/photo-1618377382884-c6c0c6b4c9f0?auto=format&fit=crop&w=600&q=80",
  accessories:
    "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=600&q=80",
};

const HERO_FALLBACK =
  "https://images.unsplash.com/photo-1617331140180-e8262094733a?auto=format&fit=crop&w=1800&q=80";

type HomeData = {
  key: string;
  shop: Shop;
  items: Item[];
  allItems: Item[];
  sizes: string[];
};

function scrollToCatalog() {
  document.getElementById("catalog")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

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

  useEffect(() => {
    if (window.location.hash === "#catalog") {
      const id = window.setTimeout(scrollToCatalog, 60);
      return () => window.clearTimeout(id);
    }
  }, [data?.key]);

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
  const heroSrc = shop.coverUrl || HERO_FALLBACK;

  function categoryPhoto(value: string): string | undefined {
    const match = allItems.find(
      (item) => item.category === value && item.photos[0],
    );
    return match?.photos[0] || CATEGORY_FALLBACK[value];
  }

  function setCategory(next: string) {
    const params = new URLSearchParams(searchParams);
    if (next && next !== "all") params.set("category", next);
    else params.delete("category");
    setSearchParams(params, { replace: true });
    window.setTimeout(scrollToCatalog, 40);
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header shop={shop} />

      <section className="relative min-h-[88vh] w-full overflow-hidden">
        <img
          src={heroSrc}
          alt=""
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="hero-veil absolute inset-0" />
        <div className="relative mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-end px-5 pb-16 pt-28 sm:justify-center sm:px-8 sm:pb-24">
          <p className="animate-rise text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-ink-soft">
            {brandName}
          </p>
          <h1 className="animate-rise-delay font-display mt-4 max-w-xl whitespace-pre-line text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-7xl">
            {shop.tagline?.trim()
              ? shop.tagline.trim().replace(/\. /g, ".\n")
              : t("home.heroHeadline")}
          </h1>
          <p className="animate-rise-delay-2 mt-5 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
            {t("home.subtitle")}
          </p>
          <div className="animate-rise-delay-2 mt-9">
            <button
              type="button"
              className="btn btn-primary min-h-12 px-7"
              onClick={scrollToCatalog}
            >
              {t("home.viewCatalog")}
            </button>
          </div>
        </div>
      </section>

      <section className="px-5 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {[t("home.uspSoft"), t("home.uspCare"), t("home.uspOrder")].map(
            (label) => (
              <div
                key={label}
                className="flex items-center justify-center gap-3 rounded-[1.25rem] border border-rule/80 bg-paper-2/90 px-4 py-4 text-center shadow-sm"
              >
                <span className="size-2 shrink-0 rounded-full bg-olive" />
                <p className="text-xs font-semibold tracking-wide text-ink-soft">
                  {label}
                </p>
              </div>
            ),
          )}
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-16 px-5 py-14 sm:px-8 sm:py-20">
        {error ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-paper-2 px-4 py-3 text-sm">
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

        <section className="space-y-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted">
                {t("home.shopByCategory")}
              </p>
              <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("home.categoriesTitle")}
              </h2>
            </div>
          </div>
          <div className="-mx-1 flex gap-5 overflow-x-auto px-1 pb-3 [scrollbar-width:thin]">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className="flex w-[5.5rem] shrink-0 flex-col items-center gap-3"
            >
              <span
                className={`grid size-[5.5rem] place-items-center overflow-hidden rounded-[1.35rem] border transition ${
                  category === "all"
                    ? "border-olive-deep ring-2 ring-olive/25"
                    : "border-rule bg-paper-2"
                }`}
              >
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-ink">
                  {t("home.allKindsShort")}
                </span>
              </span>
              <span className="text-center text-xs font-medium text-muted">
                {t("home.allKinds")}
              </span>
            </button>
            {categories.map((value) => {
              const photo = categoryPhoto(value);
              const active = category === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className="flex w-[5.5rem] shrink-0 flex-col items-center gap-3"
                >
                  <span
                    className={`size-[5.5rem] overflow-hidden rounded-[1.35rem] border transition ${
                      active
                        ? "border-olive-deep ring-2 ring-olive/25"
                        : "border-rule"
                    }`}
                  >
                    {photo ? (
                      <img
                        src={photo}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center bg-sage/50 text-[0.6rem] font-semibold uppercase">
                        {categoryLabel(value, t).slice(0, 6)}
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 text-center text-xs font-medium text-muted">
                    {categoryLabel(value, t)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section id="catalog" className="scroll-mt-24 space-y-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted">
                {t("home.catalogEyebrow")}
              </p>
              <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("home.catalogTitle")}
              </h2>
            </div>
            <form
              className="flex w-full flex-col gap-2 sm:max-w-sm sm:flex-row sm:items-center"
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

        <section className="rounded-[1.75rem] border border-rule/80 bg-sage/35 px-6 py-10 shadow-sm sm:px-10">
          <p className="font-display text-3xl font-semibold tracking-tight text-ink">
            {t("home.contactTitle")}
          </p>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
            {t("home.contactHelp")}
          </p>
          <div className="mt-6">
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
