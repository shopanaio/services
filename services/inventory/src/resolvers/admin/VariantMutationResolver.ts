import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { ZodResolver } from "@shopana/type-resolver";
import { InventoryType } from "./InventoryType.js";
import { VariantResolver } from "./VariantResolver.js";
import { StockResolver } from "./StockResolver.js";
import {
  variantCreate,
  variantDelete,
  variantSetCost,
  variantSetDimensions,
  variantSetMedia,
  variantSetPricing,
  variantSetSku,
  variantSetStock,
  variantSetWeight,
} from "../../scripts/variant/index.js";
import type {
  VariantCreateInput,
  VariantDeleteInput,
  VariantSetSkuInput,
  VariantSetDimensionsInput,
  VariantSetWeightInput,
  VariantSetPricingInput,
  VariantSetCostInput,
  VariantSetStockInput,
  VariantSetMediaInput,
} from "./generated/types.js";
import {
  VariantCreateInputSchema,
  VariantDeleteInputSchema,
  VariantSetSkuInputSchema,
  VariantSetDimensionsInputSchema,
  VariantSetWeightInputSchema,
  VariantSetPricingInputSchema,
  VariantSetCostInputSchema,
  VariantSetStockInputSchema,
  VariantSetMediaInputSchema,
} from "./generated/schemas.js";

/**
 * VariantMutation namespace resolver.
 * Handles all variant-related mutations.
 */
export class VariantMutationResolver extends InventoryType<Record<string, never>> {
  /**
   * Create a new variant.
   */
  @ZodResolver(VariantCreateInputSchema())
  async variantCreate(args: { input: VariantCreateInput }) {
    const { input } = args;

    const result = await this.ctx.kernel.executeScript(variantCreate, {
      productId: input.productId,
      options: input.variant.options.map((opt) => ({
        optionId: opt.optionId,
        optionValueId: opt.optionValueId,
      })),
      sku: input.variant.sku ?? undefined,
      externalSystem: input.variant.externalSystem ?? undefined,
      externalId: input.variant.externalId ?? undefined,
    });

    return {
      variant: result.variant
        ? new VariantResolver(result.variant.id, this.ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Delete a variant.
   */
  @ZodResolver(VariantDeleteInputSchema())
  async variantDelete(args: { input: VariantDeleteInput }) {
    const { input } = args;

    const result = await this.ctx.kernel.executeScript(variantDelete, {
      id: input.id,
      permanent: Boolean(input.permanent),
    });

    return {
      deletedVariantId: result.deletedVariantId ?? null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Set variant SKU.
   */
  @ZodResolver(VariantSetSkuInputSchema())
  async variantSetSku(args: { input: VariantSetSkuInput }) {
    const { input } = args;

    const result = await this.ctx.kernel.executeScript(variantSetSku, {
      variantId: input.variantId,
      sku: input.sku,
    });

    return {
      variant: result.variant
        ? new VariantResolver(result.variant.id, this.ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Set variant dimensions.
   */
  @ZodResolver(VariantSetDimensionsInputSchema())
  async variantSetDimensions(args: { input: VariantSetDimensionsInput }) {
    const { input } = args;

    const result = await this.ctx.kernel.executeScript(variantSetDimensions, {
      variantId: input.variantId,
      dimensions: {
        width: input.dimensions.width,
        length: input.dimensions.length,
        height: input.dimensions.height,
      },
    });

    return {
      variant: result.variant
        ? new VariantResolver(result.variant.id, this.ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Set variant weight.
   */
  @ZodResolver(VariantSetWeightInputSchema())
  async variantSetWeight(args: { input: VariantSetWeightInput }) {
    const { input } = args;

    const result = await this.ctx.kernel.executeScript(variantSetWeight, {
      variantId: input.variantId,
      weight: {
        value: input.weight.value,
      },
    });

    return {
      variant: result.variant
        ? new VariantResolver(result.variant.id, this.ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Set variant pricing.
   */
  @ZodResolver(VariantSetPricingInputSchema())
  async variantSetPricing(args: { input: VariantSetPricingInput }) {
    const { input } = args;

    const result = await this.ctx.kernel.executeScript(variantSetPricing, {
      variantId: input.variantId,
      currency: input.currency,
      amountMinor: Number(input.amountMinor),
      compareAtMinor: input.compareAtMinor
        ? Number(input.compareAtMinor)
        : undefined,
    });

    return {
      variant: result.price
        ? new VariantResolver(input.variantId, this.ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Set variant cost.
   */
  @ZodResolver(VariantSetCostInputSchema())
  async variantSetCost(args: { input: VariantSetCostInput }) {
    const { input } = args;

    const result = await this.ctx.kernel.executeScript(variantSetCost, {
      variantId: input.variantId,
      currency: input.currency,
      unitCostMinor: Number(input.unitCostMinor),
    });

    return {
      variant: result.cost
        ? new VariantResolver(input.variantId, this.ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Set variant stock.
   */
  @ZodResolver(VariantSetStockInputSchema())
  async variantSetStock(args: { input: VariantSetStockInput }) {
    const { input } = args;

    const result = await this.ctx.kernel.executeScript(variantSetStock, {
      variantId: input.variantId,
      warehouseId: input.warehouseId,
      quantity: input.quantity,
    });

    return {
      stock: result.stock
        ? new StockResolver(result.stock.id, this.ctx)
        : null,
      variant: result.stock
        ? new VariantResolver(input.variantId, this.ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Set variant media.
   */
  @ZodResolver(VariantSetMediaInputSchema())
  async variantSetMedia(args: { input: VariantSetMediaInput }) {
    const { input } = args;

    // Decode Global IDs to UUIDs
    const fileIds = input.fileIds.map((fileId) =>
      decodeGlobalIdByType(fileId, GlobalIdEntity.File)
    );

    const result = await this.ctx.kernel.executeScript(variantSetMedia, {
      variantId: input.variantId,
      fileIds,
    });

    return {
      variant: result.variant
        ? new VariantResolver(result.variant.id, this.ctx)
        : null,
      userErrors: result.userErrors,
    };
  }
}
