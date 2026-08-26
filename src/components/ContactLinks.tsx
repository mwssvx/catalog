import { useTranslation } from "react-i18next";
import {
  instagramHref,
  telegramHref,
  whatsappHref,
} from "@/lib/catalog/format";
import type { Shop } from "@/lib/catalog/types";

export function ContactLinks({
  shop,
  whatsappMessage,
  compact = false,
}: {
  shop: Shop;
  whatsappMessage: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const links = [
    {
      key: "whatsapp",
      href: whatsappHref(shop.whatsapp, whatsappMessage),
      label: t("contact.whatsapp"),
      className: "btn btn-whatsapp",
    },
    {
      key: "instagram",
      href: instagramHref(shop.instagram),
      label: t("contact.instagram"),
      className: "btn btn-instagram",
    },
    {
      key: "telegram",
      href: telegramHref(shop.telegram),
      label: t("contact.telegram"),
      className: "btn btn-telegram",
    },
  ].filter((link) => Boolean(link.href));

  if (links.length === 0) {
    return (
      <p
        className={
          compact ? "text-sm text-muted" : "text-center text-sm text-muted"
        }
      >
        {t("contact.unset")}
      </p>
    );
  }

  return (
    <div
      className={
        compact
          ? "flex flex-wrap gap-2"
          : "flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      }
    >
      {links.map((link) => (
        <a
          key={link.key}
          href={link.href!}
          target="_blank"
          rel="noopener noreferrer"
          className={`${link.className} min-h-11 flex-1 justify-center ${compact ? "text-sm" : ""}`}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
