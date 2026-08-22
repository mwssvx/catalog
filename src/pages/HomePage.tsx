import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { CatalogFilters } from "@/components/CatalogFilters";
import { CatalogGrid } from "@/components/CatalogGrid";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { api } from "@/lib/api";
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
  const status = (searchParams.get("status") as ItemFilters["status"]) || "available";
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

  return (
    <div className="flex min-h-full flex-col">
      <Header shop={shop} />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-5 py-5 sm:space-y-6 sm:px-8 sm:py-8">
        {shop.coverUrl ? (
          <img
            src={shop.coverUrl}
            alt=""
            loading="eager"
            decoding="async"
            className="h-32 w-full rounded-[28px] object-cover shadow-sm sm:h-48"
          />
        ) : null}
        <section className="rounded-[28px] bg-paper-2 px-5 py-6 shadow-sm sm:px-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-olive">
            {shop.location || t("home.locationFallback")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {shop.name}
          </h1>
          <p className="mt-2 max-w-xl text-base text-ink">
            {shop.tagline?.trim() || t("home.subtitle")}
          </p>
          <form
            className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center"
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
              className="field min-h-11 flex-1 sm:max-w-md"
            />
            <button type="submit" className="btn btn-primary min-h-11">
              {t("home.searchAction")}
            </button>
          </form>
        </section>
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
        <CatalogFilters
          status={status || "available"}
          category={category}
          size={size}
          q={q}
          sizes={sizes}
          counts={{ all: allItems.length, available: availableCount }}
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
        <div className="rounded-[24px] bg-paper-2 px-5 py-5 shadow-sm">
          <p className="text-sm font-medium text-ink">{t("home.contactTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("home.contactHelp")}</p>
          <WhatsAppButton
            shop={shop}
            label={t("home.whatsapp")}
            hint={t("home.whatsappHint")}
            message={t("home.whatsappMessage", { shop: shop.name })}
            compact
            missingLabel={t("item.contactUnset")}
          />
        </div>
      </main>
      <Footer shop={shop} />
    </div>
  );
}
