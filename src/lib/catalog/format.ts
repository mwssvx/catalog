export function formatPrice(
  amount: number | null,
  currencySymbol: string,
  askLabel: string,
): string {
  if (amount == null) return askLabel;
  return `${amount.toLocaleString("ru-RU")} ${currencySymbol}`;
}

export function whatsappDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Demo / unset numbers that must not open a fake WhatsApp chat. */
export function isPlaceholderWhatsapp(phone: string): boolean {
  const digits = whatsappDigits(phone);
  if (digits.length < 9) return true;
  if (digits === "996700000000") return true;
  if (/^9960{6,}$/.test(digits)) return true;
  return false;
}

export function whatsappHref(phone: string, text: string): string | null {
  if (isPlaceholderWhatsapp(phone)) return null;
  const digits = whatsappDigits(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Accepts @handle, handle, or full instagram.com URL. */
export function instagramHref(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;
      return url.toString();
    } catch {
      return null;
    }
  }
  const handle = raw.replace(/^@/, "").replace(/^instagram\.com\//i, "").split(/[/?#]/)[0];
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(handle)) return null;
  return `https://instagram.com/${handle}`;
}

/** Accepts @handle, handle, or full t.me URL. */
export function telegramHref(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (!/^(t\.me|telegram\.me)$/i.test(url.hostname)) return null;
      return url.toString();
    } catch {
      return null;
    }
  }
  const handle = raw.replace(/^@/, "").replace(/^(t\.me|telegram\.me)\//i, "").split(/[/?#]/)[0];
  if (!/^[a-zA-Z0-9_]{5,32}$/.test(handle)) return null;
  return `https://t.me/${handle}`;
}

export function categoryLabel(
  category: string | null | undefined,
  translate: (key: string) => string,
): string {
  if (!category) return translate("category.unsorted");
  const known = [
    "tops",
    "bottoms",
    "outerwear",
    "dresses",
    "shoes",
    "accessories",
    "sets",
    "nightdresses",
    "robes",
    "loungewear",
  ];
  if (known.includes(category)) return translate(`category.${category}`);
  return category;
}
