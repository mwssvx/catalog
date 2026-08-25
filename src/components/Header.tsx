import { useTranslation } from "react-i18next";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LogoutButton } from "@/components/studio/LogoutButton";
import type { Shop } from "@/lib/catalog/types";

function scrollToCatalog() {
  const el = document.getElementById("catalog");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }
  return false;
}

export function Header({
  shop,
  studio = false,
}: {
  shop: Shop;
  studio?: boolean;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const brand = shop.name.trim() || "Velviera";
  const mark = brand.charAt(0).toUpperCase() || "V";

  const catalogActive =
    !studio && (pathname === "/" || pathname.startsWith("/item"));
  const listActive = pathname === "/studio" || pathname.startsWith("/studio/");
  const loginActive = pathname === "/studio/login";

  function goCatalog(event: React.MouseEvent) {
    event.preventDefault();
    if (studio) {
      router.push("/");
      return;
    }
    if (pathname === "/" || pathname === "") {
      scrollToCatalog();
      return;
    }
    router.push("/");
    window.setTimeout(scrollToCatalog, 120);
  }

  return (
    <header className="sticky top-0 z-30 bg-paper/85 px-4 pt-3 backdrop-blur-md sm:px-8 sm:pt-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-[1.5rem] border border-rule/80 bg-paper-2/95 px-3 py-2.5 shadow-sm sm:px-5 sm:py-3">
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
              className="size-10 shrink-0 rounded-[1rem] object-cover"
            />
          ) : (
            <span className="grid size-10 shrink-0 place-items-center rounded-[1rem] bg-olive-deep text-sm font-semibold text-white">
              {mark}
            </span>
          )}
          <span className="font-display min-w-0 truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {brand}
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <a
            href="/#catalog"
            onClick={goCatalog}
            className={`btn btn-nav min-h-10 ${catalogActive ? "is-active" : ""}`}
          >
            {t("header.catalog")}
          </a>
          {studio ? (
            <>
              <Link
                href="/studio"
                className={`btn btn-nav min-h-10 ${listActive ? "is-active" : ""}`}
              >
                {t("header.list")}
              </Link>
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
          ) : (
            <Link
              href="/studio/login"
              className={`btn btn-secondary min-h-10 px-3 text-sm ${loginActive ? "ring-2 ring-olive/30" : ""}`}
            >
              {t("header.studio")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
