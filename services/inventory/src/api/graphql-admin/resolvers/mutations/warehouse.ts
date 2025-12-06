import type { Resolvers } from "../../generated/types.js";
import {
  warehouseCreate,
  warehouseUpdate,
  warehouseDelete,
} from "../../../../scripts/warehouse/index.js";
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
        isDefault: input.isDefault,
      });

      return {
        warehouse: result.warehouse ?? null,
        userErrors: result.userErrors,
      };
    },

    warehouseUpdate: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return noDatabaseError({ warehouse: null });
      }

      const result = await ctx.kernel.executeScript(warehouseUpdate, {
        id: input.id,
        code: input.code,
        name: input.name,
        isDefault: input.isDefault,
      });

      return {
        warehouse: result.warehouse ?? null,
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
