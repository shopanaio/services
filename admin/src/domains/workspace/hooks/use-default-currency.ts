"use client";

import type { CurrencyCode } from "@/graphql/types";
import { useWorkspace } from "./use-workspace";

/**
 * Returns the default currency for the current selected store.
 */
export function useDefaultCurrency(): CurrencyCode | null {
  const workspace = useWorkspace();

  return workspace.store?.defaultCurrency ?? null;
}
