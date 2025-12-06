import type { Resolvers } from "../../generated/types.js";
import {
  warehouseCreate,
  warehouseUpdate,
  warehouseDelete,
} from "../../../../scripts/warehouse/index.js";

export const warehouseMutationResolvers: Resolvers = {
  InventoryMutation: {
    warehouseCreate: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return {
          warehouse: null,
          userErrors: [
            { message: "Database not configured", code: "NO_DATABASE" },
          ],
        };
      }

      const result = await ctx.kernel.executeScript(warehouseCreate, {
        code: input.code,
        name: input.name,
        isDefault: input.isDefault ?? undefined,
      });

      return {
        warehouse: result.warehouse ?? null,
        userErrors: result.userErrors,
      };
    },

    warehouseUpdate: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return {
          warehouse: null,
          userErrors: [
            { message: "Database not configured", code: "NO_DATABASE" },
          ],
        };
      }

      const result = await ctx.kernel.executeScript(warehouseUpdate, {
        id: input.id,
        code: input.code ?? undefined,
        name: input.name ?? undefined,
        isDefault: input.isDefault ?? undefined,
      });

      return {
        warehouse: result.warehouse ?? null,
        userErrors: result.userErrors,
      };
    },

    warehouseDelete: async (_parent, { input }, ctx) => {
      if (!ctx.kernel) {
        return {
          deletedWarehouseId: null,
          userErrors: [
            { message: "Database not configured", code: "NO_DATABASE" },
          ],
        };
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
