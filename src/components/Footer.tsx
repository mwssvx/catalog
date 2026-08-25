import { useTranslation } from "react-i18next";
import { Link } from "@/i18n/navigation";
import { ContactLinks } from "@/components/ContactLinks";
import type { Shop } from "@/lib/catalog/types";

export function Footer({ shop }: { shop?: Shop }) {
  const { t } = useTranslation();
  const brand = shop?.name?.trim() || "Velviera";

  return (
    <footer className="mt-auto border-t border-rule/80 bg-paper-2/60 px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 text-sm text-muted">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md space-y-2">
            <p className="font-display text-2xl font-semibold tracking-tight text-ink">
              {brand}
            </p>
            <p>{t("footer.blurb")}</p>
            {shop?.location ? (
              <p className="text-xs">{shop.location}</p>
            ) : null}
          </div>
          <div className="flex flex-col items-start gap-4">
            {shop ? (
              <ContactLinks
                shop={shop}
                whatsappMessage={t("home.whatsappMessage", { shop: brand })}
                compact
              />
            ) : null}
            <nav className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/privacy" className="hover:text-ink">
                {t("footer.privacy")}
              </Link>
              <Link href="/terms" className="hover:text-ink">
                {t("footer.terms")}
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
