import { useTranslation } from "react-i18next";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LogoutButton } from "@/components/studio/LogoutButton";
import type { Shop } from "@/lib/catalog/types";

export function Header({
  shop,
  studio = false,
}: {
  shop: Shop;
  studio?: boolean;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const mark = shop.name.trim().charAt(0).toUpperCase() || "Д";
  const subtitle = studio
    ? t("header.sellerStudio")
    : shop.tagline?.trim() || shop.location;

  const catalogActive = pathname === "/" || pathname.startsWith("/item");
  const listActive = pathname === "/studio" || pathname.startsWith("/studio/");

  return (
    <header className="sticky top-0 z-30 bg-paper/90 px-4 pt-3 backdrop-blur sm:px-8 sm:pt-5">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-[24px] bg-paper-2 px-3 py-2.5 shadow-sm sm:px-5 sm:py-3">
        <Link
          href={studio ? "/studio" : "/"}
          className="flex min-w-0 items-center gap-2.5 sm:gap-3"
        >
          {shop.logoUrl ? (
            <img
              src={shop.logoUrl}
              alt=""
              loading="eager"
              decoding="async"
              className="size-10 shrink-0 rounded-[12px] object-cover"
            />
          ) : (
            <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-olive text-sm font-bold text-white">
              {mark}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold leading-none">
              {shop.name}
            </span>
            <span className="mt-1 block truncate text-xs text-muted">
              {subtitle}
            </span>
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-1 text-sm sm:gap-2">
          <LanguageSwitcher />
          <Link
            href="/"
            className={`btn btn-nav min-h-10 px-2.5 sm:px-3 ${catalogActive && !studio ? "is-active" : ""}`}
          >
            {t("header.catalog")}
          </Link>
          <Link
            href="/studio"
            className={`btn btn-nav min-h-10 px-2.5 sm:px-3 ${listActive ? "is-active" : ""}`}
          >
            {t("header.list")}
          </Link>
          {studio ? (
            <>
              <Link
                href="/studio/new"
                className="btn btn-primary hidden min-h-10 sm:inline-flex"
              >
                {t("header.addItem")}
              </Link>
              <Link
                href="/studio/settings"
                className="btn btn-nav hidden min-h-10 sm:inline-flex"
              >
                {t("header.settings")}
              </Link>
              <span className="hidden sm:inline-flex">
                <LogoutButton />
              </span>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
