"use client";
import { useDefaultCurrency } from "@/domains/workspace";
export function formatOrderMoney(amount: number, currency: string | null) {
  if (!currency) return String(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(amount);
}
export function OrderPrice({ amount }: { amount: number }) {
  return <>{formatOrderMoney(amount, useDefaultCurrency())}</>;
}
