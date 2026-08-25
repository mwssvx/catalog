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

  const catalogActive = !studio && (pathname === "/" || pathname.startsWith("/item"));
  const listActive = pathname === "/studio" || pathname.startsWith("/studio/");

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
    <header className="sticky top-0 z-30 border-b border-rule/70 bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:h-[4.5rem] sm:px-8">
        <Link
          href={studio ? "/studio" : "/"}
          className="font-display min-w-0 truncate text-2xl font-semibold tracking-[0.04em] text-ink sm:text-[1.75rem]"
        >
          {brand}
        </Link>
        <nav className="flex shrink-0 items-center gap-1 sm:gap-3">
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
          ) : null}
        </nav>
      </div>
    </header>
  );
}
