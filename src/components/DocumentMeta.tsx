import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { localeFromPath } from "@/i18n/navigation";

/** Keep <html lang>, title, and description in sync with the active locale. */
export function DocumentMeta() {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    const locale = localeFromPath(location.pathname);
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale);
    }
    document.documentElement.lang = locale;
    document.title = t("meta.title");
    const description = t("meta.description");
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);

    const ensureOg = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };
    ensureOg("og:title", t("meta.title"));
    ensureOg("og:description", description);
    ensureOg("og:type", "website");
    ensureOg("og:locale", locale === "ky" ? "ky_KG" : "ru_KG");
  }, [location.pathname, t, i18n]);

  return null;
}
