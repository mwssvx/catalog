import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CATEGORIES } from "@/lib/catalog/types";

type CatalogFiltersProps = {
  status: string;
  category: string;
  size: string;
  sizes: string[];
  counts: { all: number; available: number };
};

function chipClass(active: boolean) {
  return active
    ? "rounded-[14px] bg-ink px-3 py-2 text-sm font-medium text-white"
    : "rounded-[14px] bg-paper-2 px-3 py-2 text-sm font-medium text-muted shadow-sm hover:text-ink";
}

function query(
  next: { status?: string; category?: string; size?: string },
  current: CatalogFiltersProps,
) {
  const status = next.status ?? current.status;
  const category = next.category ?? current.category;
  const size = next.size ?? current.size;
  const params: Record<string, string> = {};
  if (status && status !== "available") params.status = status;
  if (category && category !== "all") params.category = category;
  if (size && size !== "all") params.size = size;
  return params;
}

export async function CatalogFilters(props: CatalogFiltersProps) {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Link
          href={{ pathname: "/", query: query({ status: "available" }, props) }}
          className={chipClass(props.status === "available")}
        >
          {t("home.available", { count: props.counts.available })}
        </Link>
        <Link
          href={{ pathname: "/", query: query({ status: "all" }, props) }}
          className={chipClass(props.status === "all")}
        >
          {t("home.allItems", { count: props.counts.all })}
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={{ pathname: "/", query: query({ category: "all" }, props) }}
          className={chipClass(props.category === "all")}
        >
          {t("home.allKinds")}
        </Link>
        {CATEGORIES.map((category) => (
          <Link
            key={category}
            href={{ pathname: "/", query: query({ category }, props) }}
            className={chipClass(props.category === category)}
          >
            {t(`category.${category}`)}
          </Link>
        ))}
      </div>
      {props.sizes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href={{ pathname: "/", query: query({ size: "all" }, props) }}
            className={chipClass(props.size === "all")}
          >
            {t("home.anySize")}
          </Link>
          {props.sizes.map((size) => (
            <Link
              key={size}
              href={{ pathname: "/", query: query({ size }, props) }}
              className={chipClass(props.size === size)}
            >
              {size}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
