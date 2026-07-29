import {
  DiscountKind,
  DiscountMethod,
  type CurrencyCode,
} from "@/graphql/types";
import { formatPrice } from "@/domains/inventory/products/utils/price-formatting";

export function formatDiscountEnum(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

const DISCOUNT_METHOD_LABELS: Record<DiscountMethod, string> = {
  [DiscountMethod.Automatic]: "Automatic",
  [DiscountMethod.Code]: "Discount code",
};

const DISCOUNT_KIND_LABELS: Record<DiscountKind, string> = {
  [DiscountKind.AmountOffOrder]: "Amount off order",
  [DiscountKind.AmountOffProducts]: "Amount off products",
  [DiscountKind.BuyXGetY]: "Buy X Get Y",
  [DiscountKind.FreeShipping]: "Free shipping",
};

export function formatDiscountMethod(value: DiscountMethod): string {
  return DISCOUNT_METHOD_LABELS[value];
}

export function formatDiscountKind(value: DiscountKind): string {
  return DISCOUNT_KIND_LABELS[value];
}

const detailDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDiscountDate(value: string): string {
  return detailDateFormatter.format(new Date(value));
}

const compactDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export function formatDiscountCompactDate(value: string): string {
  return compactDateFormatter.format(new Date(value));
}

const detailDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDiscountDateTime(value: string): string {
  return detailDateTimeFormatter.format(new Date(value));
}

export function formatDiscountCount(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDiscountMoney(
  amountMinor: number | null | undefined,
  currency: CurrencyCode | null,
): string {
  if (amountMinor == null || !currency) return "—";
  const formatted = formatPrice(amountMinor, currency, "en-US");

  return currency === "UAH"
    ? formatted.replace("₴", "₴\u00A0")
    : formatted;
}

export function formatDiscountPercentage(
  percentageBps: number | null | undefined,
): string {
  if (percentageBps == null) return "—";
  const percentage = percentageBps / 100;
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(percentage)}%`;
}

export function getShortDiscountId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
