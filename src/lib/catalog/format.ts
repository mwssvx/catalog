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
