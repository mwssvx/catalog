import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { categoryLabel } from "@/lib/catalog/format";
import { DEFAULT_SHOP_CATEGORIES } from "@/lib/catalog/types";

type CatalogFiltersProps = {
  status: string;
  category: string;
  size: string;
  q?: string;
  sizes: string[];
  categories?: string[];
  counts: { all: number; available: number };
  /** When categories are shown elsewhere (e.g. home shop-by-category strip). */
  hideCategories?: boolean;
};

function chipClass(active: boolean) {
  return active ? "chip is-active min-h-10" : "chip min-h-10";
}

export function CatalogFilters(props: CatalogFiltersProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const categories =
    props.categories && props.categories.length > 0
      ? props.categories
      : DEFAULT_SHOP_CATEGORIES;

  function apply(next: {
    status?: string;
    category?: string;
    size?: string;
  }) {
    const status = next.status ?? props.status;
    const category = next.category ?? props.category;
    const size = next.size ?? props.size;
    const params = new URLSearchParams();
    if (status && status !== "available") params.set("status", status);
    if (category && category !== "all") params.set("category", category);
    if (size && size !== "all") params.set("size", size);
    const q = (props.q ?? searchParams.get("q") ?? "").trim();
    if (q) params.set("q", q);
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => apply({ status: "available" })}
          className={chipClass(props.status === "available")}
        >
          {t("home.available", { count: props.counts.available })}
        </button>
        <button
          type="button"
          onClick={() => apply({ status: "all" })}
          className={chipClass(props.status === "all")}
        >
          {t("home.allItems", { count: props.counts.all })}
        </button>
      </div>
      {!props.hideCategories ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => apply({ category: "all" })}
            className={chipClass(props.category === "all")}
          >
            {t("home.allKinds")}
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => apply({ category })}
              className={chipClass(props.category === category)}
            >
              {categoryLabel(category, t)}
            </button>
          ))}
        </div>
      ) : null}
      {props.sizes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => apply({ size: "all" })}
            className={chipClass(props.size === "all")}
          >
            {t("home.anySize")}
          </button>
          {props.sizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => apply({ size })}
              className={chipClass(props.size === size)}
            >
              {size}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
