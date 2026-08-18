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

export function whatsappHref(phone: string, text: string): string | null {
  const digits = whatsappDigits(phone);
  if (digits.length < 9) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
