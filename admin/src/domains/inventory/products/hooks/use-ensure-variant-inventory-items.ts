"use client";

import { useCallback, useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import type { ApiVariant } from "@/graphql/types";
import { INVENTORY_ITEM_BY_VARIANT_QUERY } from "../graphql";
import type {
  InventoryItemByVariantQueryData,
  InventoryItemByVariantQueryVariables,
} from "../graphql";

interface UseEnsureVariantInventoryItemsReturn {
  ensureVariantInventoryItems: (variants: ApiVariant[]) => Promise<ApiVariant[]>;
  loading: boolean;
}

export function useEnsureVariantInventoryItems(): UseEnsureVariantInventoryItemsReturn {
  const client = useApolloClient();
  const [loading, setLoading] = useState(false);

  const ensureVariantInventoryItems = useCallback(
    async (variants: ApiVariant[]): Promise<ApiVariant[]> => {
      const missingVariants = variants.filter((variant) => !variant.inventoryItem);

      if (missingVariants.length === 0) {
        return variants;
      }

      setLoading(true);

      try {
        const inventoryItemsByVariantId = new Map<string, ApiVariant["inventoryItem"]>();

        for (const variant of missingVariants) {
          const result = await client.query<
            InventoryItemByVariantQueryData,
            InventoryItemByVariantQueryVariables
          >({
            query: INVENTORY_ITEM_BY_VARIANT_QUERY,
            variables: { variantId: variant.id },
            fetchPolicy: "network-only",
          });

          const inventoryItem =
            result.data?.inventoryQuery.inventoryItemByVariant ?? null;

          if (!inventoryItem) {
            throw new Error(
              `Inventory item could not be loaded for variant ${variant.title ?? variant.handle}`,
            );
          }

          inventoryItemsByVariantId.set(variant.id, inventoryItem);
        }

        return variants.map((variant) => {
          const inventoryItem = inventoryItemsByVariantId.get(variant.id);

          return inventoryItem ? { ...variant, inventoryItem } : variant;
        });
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  return {
    ensureVariantInventoryItems,
    loading,
  };
}
