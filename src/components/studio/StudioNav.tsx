import { useTranslation } from "react-i18next";
import { Link, usePathname } from "@/i18n/navigation";

const LINKS = [
  { href: "/", key: "navCatalog" },
  { href: "/studio", key: "navProducts" },
  { href: "/studio/new", key: "navNew" },
  { href: "/studio/settings", key: "navSettings" },
] as const;

export function StudioNav() {
  const { t } = useTranslation();
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper-2/95 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1">
        {LINKS.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/" || pathname.startsWith("/item")
              : link.href === "/studio"
                ? pathname === "/studio"
                : pathname.startsWith(link.href);
          return (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                className={`btn btn-nav flex min-h-12 w-full flex-col justify-center px-1 py-2 text-xs ${active ? "is-active" : ""}`}
              >
                {t(`studio.${link.key}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
