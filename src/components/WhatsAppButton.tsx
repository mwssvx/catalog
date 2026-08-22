import { formatPrice, whatsappHref } from "@/lib/catalog/format";
import type { Item, Shop } from "@/lib/catalog/types";

export function WhatsAppButton({
  shop,
  label,
  hint,
  message,
  missingLabel,
  compact = false,
}: {
  shop: Shop;
  label: string;
  hint: string;
  message: string;
  missingLabel?: string;
  compact?: boolean;
}) {
  const href = whatsappHref(shop.whatsapp, message);
  if (!href) {
    if (!missingLabel) return null;
    return (
      <p
        className={
          compact
            ? "mt-4 text-sm text-muted"
            : "mt-6 text-center text-sm text-muted"
        }
      >
        {missingLabel}
      </p>
    );
  }

  return (
    <div className={compact ? "mt-4 space-y-2" : "mt-6 space-y-2"}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={
          compact ? "btn btn-whatsapp text-sm" : "btn btn-whatsapp w-full py-3"
        }
      >
        {label}
      </a>
      <p className={compact ? "text-xs text-muted" : "text-center text-xs text-muted"}>
        {hint}
      </p>
    </div>
  );
}

export function buildWhatsAppMessage(
  template: string,
  item: Item,
  shop: Shop,
  askLabel: string,
): string {
  return template
    .replace("{code}", item.code || "")
    .replace("{title}", item.title)
    .replace("{size}", item.sizes.join(", ") || askLabel)
    .replace("{price}", formatPrice(item.price, shop.currencySymbol, askLabel));
}
