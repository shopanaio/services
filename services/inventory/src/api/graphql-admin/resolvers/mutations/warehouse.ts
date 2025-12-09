import {
  warehouseCreate,
  warehouseDelete,
  warehouseUpdate,
} from "../../../../scripts/warehouse/index.js";
import type { Resolvers, Warehouse } from "../../generated/types.js";
import { noDatabaseError } from "../utils.js";

export const warehouseMutationResolvers: Resolvers = {
  InventoryMutation: {
    warehouseCreate: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ warehouse: null });
      }

      const result = await ctx.kernel.executeScript(warehouseCreate, {
        code: input.code,
        name: input.name,
        isDefault: input.isDefault ?? undefined,
      });

      return {
        warehouse: result.warehouse
          ? ({ id: result.warehouse.id } as Warehouse)
          : null,
        userErrors: result.userErrors,
      };
    },

    warehouseUpdate: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ warehouse: null });
      }

      const result = await ctx.kernel.executeScript(warehouseUpdate, {
        id: input.id,
        code: input.code ?? undefined,
        name: input.name ?? undefined,
        isDefault: input.isDefault ?? undefined,
      });

      return {
        warehouse: result.warehouse
          ? ({ id: result.warehouse.id } as Warehouse)
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
