// Non-breaking space for currency formatting
const NBSP = "\u00A0";

export const formatPrice = (
  amount: number,
  currency: string = "RUB",
  locale: string = "ru-RU"
): string => {
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount / 100);
  return formatted.replace(/\s+/g, NBSP);
};

export const formatShortDate = (date: Date, locale: string = "ru-RU"): string => {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(date);
};

export const formatDateTime = (date: Date, locale: string = "ru-RU"): string => {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatDateFull = (date: Date, locale: string = "ru-RU"): string => {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};
