import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { Shop } from "@/lib/catalog/types";

export async function Header({
  shop,
  studio = false,
}: {
  shop: Shop;
  studio?: boolean;
}) {
  const t = await getTranslations("header");

  return (
    <header className="px-5 pt-5 sm:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-[24px] bg-paper-2 px-4 py-3 shadow-sm sm:px-5">
        <Link href={studio ? "/studio" : "/"} className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-olive text-sm font-bold text-white">
            Д
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold leading-none">
              {shop.name}
            </span>
            <span className="mt-1 block truncate text-xs text-muted">
              {studio ? t("sellerStudio") : shop.location}
            </span>
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-2 text-sm">
          <Suspense fallback={<div className="h-7 w-16 rounded-[14px] bg-paper" />}>
            <LanguageSwitcher />
          </Suspense>
          {studio ? (
            <>
              <Link
                href="/"
                className="hidden rounded-[14px] px-3 py-2 text-muted hover:bg-paper hover:text-ink sm:inline"
              >
                {t("viewShop")}
              </Link>
              <Link
                href="/studio/board"
                className="rounded-[14px] bg-ink px-4 py-2 font-medium text-white hover:bg-olive"
              >
                {t("openBoard")}
              </Link>
              <Link
                href="/studio/new"
                className="hidden rounded-[14px] bg-paper px-4 py-2 font-medium text-ink sm:inline"
              >
                {t("addItem")}
              </Link>
            </>
          ) : (
            <Link
              href="/studio"
              className="rounded-[14px] bg-paper px-4 py-2 font-medium text-ink hover:bg-rule"
            >
              {t("studio")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
