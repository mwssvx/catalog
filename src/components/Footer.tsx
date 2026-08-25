import { useTranslation } from "react-i18next";
import { Link } from "@/i18n/navigation";
import { ContactLinks } from "@/components/ContactLinks";
import type { Shop } from "@/lib/catalog/types";

export function Footer({ shop }: { shop?: Shop }) {
  const { t } = useTranslation();
  const brand = shop?.name?.trim() || "Velviera";

  return (
    <footer className="mt-auto border-t border-rule/80 bg-paper-2/70 px-5 py-12 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 text-sm text-muted">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md space-y-3">
            <p className="font-display text-3xl font-semibold tracking-tight text-ink">
              {brand}
            </p>
            <p className="leading-relaxed">{t("footer.blurb")}</p>
            {shop?.location ? <p className="text-xs">{shop.location}</p> : null}
          </div>
          <div className="flex flex-col items-start gap-5">
            {shop ? (
              <ContactLinks
                shop={shop}
                whatsappMessage={t("home.whatsappMessage", { shop: brand })}
                compact
              />
            ) : null}
            <nav className="flex flex-wrap items-center gap-3">
              <Link href="/privacy" className="btn btn-nav min-h-10">
                {t("footer.privacy")}
              </Link>
              <Link href="/terms" className="btn btn-nav min-h-10">
                {t("footer.terms")}
              </Link>
              <Link href="/studio/login" className="btn btn-secondary min-h-10">
                {t("header.studio")}
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
