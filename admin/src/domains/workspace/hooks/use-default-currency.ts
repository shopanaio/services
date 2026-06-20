"use client";

import type { CurrencyCode } from "@/graphql/types";
import { useStore } from "./use-store";

/**
 * Returns the default currency for the current selected store.
 */
export function useDefaultCurrency(): CurrencyCode | null {
  const store = useStore();

  return store?.defaultCurrency ?? null;
}
