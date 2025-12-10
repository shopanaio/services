import { parseGraphqlInfo } from "@shopana/type-executor";
import {
  warehouseCreate,
  warehouseDelete,
  warehouseUpdate,
} from "../../../../scripts/warehouse/index.js";
import { WarehouseView } from "../../../../views/admin/index.js";
import type { Resolvers, Warehouse } from "../../generated/types.js";
import { noDatabaseError, requireContext } from "../utils.js";

export const warehouseMutationResolvers: Resolvers = {
  InventoryMutation: {
    warehouseCreate: async (_parent, { input }, ctx, info) => {
      console.log("[warehouseCreate resolver] input:", JSON.stringify(input));
      console.log(
        "[warehouseCreate resolver] ctx.kernel exists:",
        !!ctx.kernel
      );

      if (!ctx.kernel) {
        console.log(
          "[warehouseCreate resolver] No kernel, returning noDatabaseError"
        );
        return noDatabaseError({ warehouse: null });
      }

      console.log("[warehouseCreate resolver] Calling kernel.executeScript...");
      const result = await ctx.kernel.executeScript(warehouseCreate, {
        code: input.code,
        name: input.name,
        isDefault: input.isDefault ?? undefined,
      });

      console.log(
        "[warehouseCreate resolver] Script result:",
        JSON.stringify(result)
      );
      console.log(
        "[warehouseCreate resolver] result.warehouse:",
        result.warehouse
      );
      console.log(
        "[warehouseCreate resolver] result.warehouse?.id:",
        result.warehouse?.id
      );

      const warehouseFieldInfo = parseGraphqlInfo(info, "warehouse");

      return {
        warehouse: result.warehouse
          ? ((await WarehouseView.load(
              result.warehouse.id,
              warehouseFieldInfo,
              requireContext(ctx)
            )) as Warehouse)
          : null,
        userErrors: result.userErrors,
      };
    },

    warehouseUpdate: async (_parent, { input }, ctx, info) => {
      if (!ctx.kernel) {
        return noDatabaseError({ warehouse: null });
      }

      const result = await ctx.kernel.executeScript(warehouseUpdate, {
        id: input.id,
        code: input.code ?? undefined,
        name: input.name ?? undefined,
        isDefault: input.isDefault ?? undefined,
      });

      const warehouseFieldInfo = parseGraphqlInfo(info, "warehouse");

      return {
        warehouse: result.warehouse
          ? ((await WarehouseView.load(
              result.warehouse.id,
              warehouseFieldInfo,
              requireContext(ctx)
            )) as Warehouse)
          : null,
        userErrors: result.userErrors,
      };
    },

    warehouseDelete: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ deletedWarehouseId: null });
      }

      const result = await ctx.kernel.executeScript(warehouseDelete, {
        id: input.id,
      });

      return {
        deletedWarehouseId: result.deletedWarehouseId ?? null,
        userErrors: result.userErrors,
      };
    },
  },
};
