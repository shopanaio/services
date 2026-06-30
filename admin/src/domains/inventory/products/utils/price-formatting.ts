import { useMemo } from "react";
import type { ApiVariantPrice } from "@/graphql/types";

const NBSP = "\u00A0";

export const formatPrice = (
  amount: number,
  currency: string = "RUB",
  locale: string = "ru-RU",
): string => {
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(amount / 100);

  return formatted.replace(/\s+/g, NBSP);
};

export const formatCurrencySymbol = (
  currency: string,
  locale: string = "en-US",
): string => {
  const currencyPart = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  })
    .formatToParts(0)
    .find((part) => part.type === "currency");

  return currencyPart?.value ?? currency;
};

export const formatShortDate = (
  date: Date,
  locale: string = "ru-RU",
): string =>
  new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(date);

export const formatDateTime = (
  date: Date,
  locale: string = "ru-RU",
): string =>
  new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

export const formatDateFull = (
  date: Date,
  locale: string = "ru-RU",
): string =>
  new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

export function useVariantPrice(price: ApiVariantPrice): string;
export function useVariantPrice(
  price: ApiVariantPrice | null | undefined,
  fallback?: string,
): string;
export function useVariantPrice(
  price: ApiVariantPrice | null | undefined,
  fallback = "\u2014",
): string {
  const amountMinor = price?.amountMinor;
  const currency = price?.currency;

  return useMemo(() => {
    if (amountMinor === undefined || !currency) {
      return fallback;
    }

    return formatPrice(amountMinor, currency);
  }, [amountMinor, currency, fallback]);
}
