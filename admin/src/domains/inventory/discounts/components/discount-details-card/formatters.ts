import { DiscountKind, DiscountMethod } from "@/graphql/types";

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

export function getShortDiscountId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
