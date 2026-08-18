import { formatPrice, whatsappHref } from "@/lib/catalog/format";
import type { Item, Shop } from "@/lib/catalog/types";

export function WhatsAppButton({
  shop,
  label,
  hint,
  message,
}: {
  shop: Shop;
  label: string;
  hint: string;
  message: string;
}) {
  const href = whatsappHref(shop.whatsapp, message);
  if (!href) return null;

  return (
    <div className="mt-6 space-y-2">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center rounded-[16px] bg-[#25D366] px-5 py-3 text-center font-medium text-white hover:opacity-90"
      >
        {label}
      </a>
      <p className="text-center text-xs text-muted">{hint}</p>
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
