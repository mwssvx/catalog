import { useTranslation } from "react-i18next";
import { Link } from "@/i18n/navigation";
import { whatsappHref } from "@/lib/catalog/format";
import type { Shop } from "@/lib/catalog/types";

export function Footer({ shop }: { shop?: Shop }) {
  const { t } = useTranslation();
  const contact =
    shop &&
    whatsappHref(shop.whatsapp, t("home.whatsappMessage", { shop: shop.name }));

  return (
    <footer className="mt-auto border-t border-rule/60 px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 text-sm text-muted">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md space-y-1">
            <p className="font-medium text-ink">
              {shop?.name || t("meta.title")}
            </p>
            <p>{t("footer.blurb")}</p>
            {shop?.location ? (
              <p className="text-xs">{shop.location}</p>
            ) : null}
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-2">
            {contact ? (
              <a
                href={contact}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#189e4a] hover:underline"
              >
                {t("footer.whatsapp")}
              </a>
            ) : (
              <Link href="/studio/settings" className="hover:text-ink">
                {t("footer.setWhatsapp")}
              </Link>
            )}
            <Link href="/privacy" className="hover:text-ink">
              {t("footer.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-ink">
              {t("footer.terms")}
            </Link>
            <Link href="/studio" className="hover:text-ink">
              {t("footer.studio")}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
