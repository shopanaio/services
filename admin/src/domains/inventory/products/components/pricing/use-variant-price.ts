import { useMemo } from "react";
import type { ApiVariantPrice } from "@/graphql/types";
import { formatPrice } from "./utils";

export function useVariantPrice(price: ApiVariantPrice): string;
export function useVariantPrice(
  price: ApiVariantPrice | null | undefined,
  fallback?: string
): string;
export function useVariantPrice(
  price: ApiVariantPrice | null | undefined,
  fallback = "\u2014"
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
