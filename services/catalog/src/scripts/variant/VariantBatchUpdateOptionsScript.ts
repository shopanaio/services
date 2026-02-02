import { randomUUID } from "crypto";
import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { Variant, ProductOptionVariantLink } from "../../repositories/models/index.js";
import {
  type ScriptResult,
  successResult,
  unchangedResult,
} from "../types/ScriptResult.js";
import type { OptionLinkChanges } from "../types/ProductChanges.js";
import { buildVariantHandle } from "./helpers/buildVariantHandle.js";

export interface VariantOptionLink {
  readonly optionId: string;
  readonly optionValueId: string;
}

export interface VariantOptionsUpdate {
  readonly variantId: string;
  readonly links: VariantOptionLink[];
}

export interface VariantBatchUpdateOptionsParams {
  readonly productId: string;
  readonly updates: VariantOptionsUpdate[];
}

export interface VariantBatchUpdateResult {
  readonly variantId: string;
  readonly applied: boolean;
  readonly errors: UserError[];
  readonly changes: OptionLinkChanges[] | null;
}

export type VariantBatchUpdateOptionsResult = ScriptResult<
  VariantBatchUpdateResult[],
  null
>;

/**
 * Script for batch updating variant option value links.
 *
 * This script handles multiple variant option updates in a single transaction,
 * which allows swapping option combinations between variants.
 *
 * Key behaviors:
 * - Validates all options and values belong to the product
 * - Uses temporary handles to avoid unique constraint conflicts during swaps
 * - Rebuilds all variant handles after links are updated
 * - Detects duplicate option combinations across the batch
 */
export class VariantBatchUpdateOptionsScript extends BaseScript<
  VariantBatchUpdateOptionsParams,
  VariantBatchUpdateOptionsResult
> {
  protected async execute(
    params: VariantBatchUpdateOptionsParams
  ): Promise<VariantBatchUpdateOptionsResult> {
    const { productId, updates } = params;
    const projectId = this.getProjectId();

    if (updates.length === 0) {
      return unchangedResult([]);
    }

    // 1. Load all variants for the product and filter to requested ones
    const variantIds = new Set(updates.map((u) => u.variantId));
    const allProductVariants = await this.repository.variant.findByProductId(productId);
    const variantMap = new Map(
      allProductVariants
        .filter((v) => variantIds.has(v.id))
        .map((v) => [v.id, v])
    );

    const results: VariantBatchUpdateResult[] = [];
    const validUpdates: Array<{
      variant: Variant;
      links: VariantOptionLink[];
      currentLinks: ProductOptionVariantLink[];
    }> = [];

    // Validate all variants exist and belong to product
    for (const update of updates) {
      const variant = variantMap.get(update.variantId);
      if (!variant) {
        results.push({
          variantId: update.variantId,
          applied: false,
          errors: [{ message: "Variant not found", code: "NOT_FOUND", field: ["variantId"] }],
          changes: null,
        });
        continue;
      }
      // Variant already filtered to productId, no need to check again
      validUpdates.push({ variant, links: update.links, currentLinks: [] as ProductOptionVariantLink[] });
    }

    if (validUpdates.length === 0) {
      return successResult(results, null);
    }

    // 2. Load product options and values for validation
    const productOptions = await this.repository.option.findByProductId(productId);
    const productOptionIds = new Set(productOptions.map((o) => o.id));

    const allOptionIds = [...new Set(validUpdates.flatMap((u) => u.links.map((l) => l.optionId)))];
    const valuesByOption = allOptionIds.length > 0
      ? await this.repository.option.findValuesByOptionIds(allOptionIds)
      : new Map();

    // Build valueId -> optionId map
    const valueToOption = new Map<string, string>();
    for (const [optionId, values] of valuesByOption) {
      for (const value of values) {
        valueToOption.set(value.id, optionId);
      }
    }

    // 3. Load current links for all variants
    const currentLinksMap = await this.repository.option.findVariantLinks(
      validUpdates.map((u) => u.variant.id)
    );
    for (const update of validUpdates) {
      update.currentLinks = currentLinksMap.get(update.variant.id) ?? [];
    }

    // 4. Validate each update
    const updatesToApply: typeof validUpdates = [];

    for (const update of validUpdates) {
      const { variant, links } = update;
      const errors: UserError[] = [];

      // Validate empty links
      if (links.length === 0 && !variant.isDefault) {
        errors.push({
          message: "Non-default variant must have at least one option value",
          code: "INVALID_OPTIONS",
          field: ["links"],
        });
      }

      // Validate options belong to product
      for (const link of links) {
        if (!productOptionIds.has(link.optionId)) {
          errors.push({
            message: `Option ${link.optionId} does not belong to this product`,
            code: "INVALID_OPTION",
            field: ["links", "optionId"],
          });
        }
      }

      // Validate values belong to options
      for (const link of links) {
        const expectedOptionId = valueToOption.get(link.optionValueId);
        if (!expectedOptionId) {
          errors.push({
            message: `Option value ${link.optionValueId} not found`,
            code: "INVALID_OPTION_VALUE",
            field: ["links", "optionValueId"],
          });
        } else if (expectedOptionId !== link.optionId) {
          errors.push({
            message: `Option value ${link.optionValueId} does not belong to option ${link.optionId}`,
            code: "INVALID_OPTION_VALUE",
            field: ["links", "optionValueId"],
          });
        }
      }

      // Check for duplicate options in same variant
      const seenOptions = new Set<string>();
      for (const link of links) {
        if (seenOptions.has(link.optionId)) {
          errors.push({
            message: `Duplicate option ${link.optionId} in links`,
            code: "DUPLICATE_OPTION",
            field: ["links"],
          });
          break;
        }
        seenOptions.add(link.optionId);
      }

      if (errors.length > 0) {
        results.push({
          variantId: variant.id,
          applied: false,
          errors,
          changes: null,
        });
      } else {
        updatesToApply.push(update);
      }
    }

    if (updatesToApply.length === 0) {
      return successResult(results, null);
    }

    // 5. Check which updates actually have changes
    const updatesWithChanges = updatesToApply.filter((update) => {
      const currentLinkSet = new Set(
        update.currentLinks.map((l) => `${l.optionId}:${l.optionValueId}`)
      );
      const newLinkSet = new Set(
        update.links.map((l) => `${l.optionId}:${l.optionValueId}`)
      );
      return (
        currentLinkSet.size !== newLinkSet.size ||
        [...currentLinkSet].some((key) => !newLinkSet.has(key))
      );
    });

    // Mark unchanged updates as successful
    for (const update of updatesToApply) {
      if (!updatesWithChanges.includes(update)) {
        results.push({
          variantId: update.variant.id,
          applied: true,
          errors: [],
          changes: null,
        });
      }
    }

    if (updatesWithChanges.length === 0) {
      return successResult(results, null);
    }

    // 6. Set temporary handles for all variants to avoid unique constraint conflicts
    const tempHandles = new Map<string, string>();
    for (const update of updatesWithChanges) {
      const tempHandle = `__temp_${randomUUID()}`;
      tempHandles.set(update.variant.id, tempHandle);
      await this.repository.variant.update(update.variant.id, { handle: tempHandle });
    }

    // 7. Clear and set new links for all variants
    for (const update of updatesWithChanges) {
      await this.repository.option.clearVariantLinks(update.variant.id);
      for (const link of update.links) {
        await this.repository.option.linkVariant(
          update.variant.id,
          link.optionId,
          link.optionValueId
        );
      }
    }

    // 8. Build new handles for all variants
    const newHandles = new Map<string, string>();
    for (const update of updatesWithChanges) {
      const newHandle = await buildVariantHandle(
        this.repository.db,
        update.variant.id,
        projectId
      );
      newHandles.set(update.variant.id, newHandle);
    }

    // 9. Check for duplicate handles in the batch
    const handleCounts = new Map<string, string[]>();
    for (const [variantId, handle] of newHandles) {
      const existing = handleCounts.get(handle) ?? [];
      existing.push(variantId);
      handleCounts.set(handle, existing);
    }

    const duplicateHandles = [...handleCounts.entries()].filter(
      ([_, variantIds]) => variantIds.length > 1
    );

    if (duplicateHandles.length > 0) {
      // Rollback: restore original links and handles
      for (const update of updatesWithChanges) {
        await this.repository.option.clearVariantLinks(update.variant.id);
        for (const link of update.currentLinks) {
          if (link.optionValueId) {
            await this.repository.option.linkVariant(
              update.variant.id,
              link.optionId,
              link.optionValueId
            );
          }
        }
        await this.repository.variant.update(update.variant.id, {
          handle: update.variant.handle,
        });
      }

      // Mark all as failed
      for (const update of updatesWithChanges) {
        results.push({
          variantId: update.variant.id,
          applied: false,
          errors: [{
            message: "Another variant with the same option combination already exists",
            code: "DUPLICATE_OPTIONS",
            field: ["links"],
          }],
          changes: null,
        });
      }

      return successResult(results, null);
    }

    // 10. Apply final handles
    for (const update of updatesWithChanges) {
      const newHandle = newHandles.get(update.variant.id)!;

      // Non-default variants must have non-empty handle
      if (!update.variant.isDefault && newHandle === "") {
        // Rollback this variant
        await this.repository.option.clearVariantLinks(update.variant.id);
        for (const link of update.currentLinks) {
          if (link.optionValueId) {
            await this.repository.option.linkVariant(
              update.variant.id,
              link.optionId,
              link.optionValueId
            );
          }
        }
        await this.repository.variant.update(update.variant.id, {
          handle: update.variant.handle,
        });

        results.push({
          variantId: update.variant.id,
          applied: false,
          errors: [{
            message: "Non-default variant must have at least one option value",
            code: "INVALID_OPTIONS",
            field: ["links"],
          }],
          changes: null,
        });
        continue;
      }

      try {
        await this.repository.variant.update(update.variant.id, { handle: newHandle });

        results.push({
          variantId: update.variant.id,
          applied: true,
          errors: [],
          changes: update.links.map((l) => ({
            optionId: l.optionId,
            valueId: l.optionValueId,
          })),
        });

        this.logger.info(
          { variantId: update.variant.id, linkCount: update.links.length, newHandle },
          "Variant options updated successfully"
        );
      } catch (error) {
        // Unique constraint violation - conflict with existing variant not in batch
        if (isUniqueViolation(error, "variant_product_id_handle_key")) {
          // Rollback this variant
          await this.repository.option.clearVariantLinks(update.variant.id);
          for (const link of update.currentLinks) {
            if (link.optionValueId) {
              await this.repository.option.linkVariant(
                update.variant.id,
                link.optionId,
                link.optionValueId
              );
            }
          }
          await this.repository.variant.update(update.variant.id, {
            handle: update.variant.handle,
          });

          results.push({
            variantId: update.variant.id,
            applied: false,
            errors: [{
              message: "Another variant with the same option combination already exists",
              code: "DUPLICATE_OPTIONS",
              field: ["links"],
            }],
            changes: null,
          });
        } else {
          throw error;
        }
      }
    }

    return successResult(results, null);
  }

  protected handleError(error: unknown): VariantBatchUpdateOptionsResult {
    const msg = error instanceof Error ? error.message : String(error);
    this.logger.error({ error, msg }, "VariantBatchUpdateOptionsScript failed");
    return {
      result: null,
      changes: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
