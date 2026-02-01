import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { Variant } from "../../repositories/models/index.js";
import {
  type ScriptResult,
  successResult,
  unchangedResult,
  singleError,
  errorResult,
} from "../types/ScriptResult.js";
import type { OptionLinkChanges } from "../types/ProductChanges.js";
import { buildVariantHandle } from "./helpers/buildVariantHandle.js";

export interface VariantOptionLink {
  readonly optionId: string;
  readonly optionValueId: string;
}

export interface VariantUpdateOptionsParams {
  readonly variantId: string;
  readonly links: VariantOptionLink[];
}

export type VariantUpdateOptionsResult = ScriptResult<Variant, OptionLinkChanges[]>;

/**
 * Script for updating variant option value links.
 *
 * Key behaviors:
 * - Validates that all options and values belong to the product
 * - Replaces all existing links with new ones
 * - Rebuilds the variant handle from option value slugs
 * - Handles unique constraint on (productId, handle)
 */
export class VariantUpdateOptionsScript extends BaseScript<
  VariantUpdateOptionsParams,
  VariantUpdateOptionsResult
> {
  protected async execute(
    params: VariantUpdateOptionsParams
  ): Promise<VariantUpdateOptionsResult> {
    const { variantId, links } = params;

    // Validate variant exists
    const existingVariant = await this.repository.variant.findById(variantId);
    if (!existingVariant) {
      return singleError("Variant not found", "NOT_FOUND", ["variantId"]);
    }

    const productId = existingVariant.productId;
    const projectId = this.getProjectId();

    // Handle empty links (clear all options)
    if (links.length === 0) {
      // Non-default variants must have options
      if (!existingVariant.isDefault) {
        return singleError(
          "Non-default variant must have at least one option value",
          "INVALID_OPTIONS",
          ["links"]
        );
      }

      await this.repository.option.clearVariantLinks(variantId);

      // Set empty handle for default variant without options
      if (existingVariant.handle !== "") {
        await this.repository.variant.update(variantId, { handle: "" });
      }

      this.logger.info({ variantId }, "Variant options cleared");
      return successResult(existingVariant, []);
    }

    // Validate all options belong to this product
    const optionIds = [...new Set(links.map((l) => l.optionId))];
    const productOptions =
      await this.repository.option.findByProductId(productId);
    const productOptionIds = new Set(productOptions.map((o) => o.id));

    for (const optionId of optionIds) {
      if (!productOptionIds.has(optionId)) {
        return singleError(
          `Option ${optionId} does not belong to this product`,
          "INVALID_OPTION",
          ["links", "optionId"]
        );
      }
    }

    // Validate all values belong to their respective options
    const valueIds = [...new Set(links.map((l) => l.optionValueId))];
    const valuesByOption =
      await this.repository.option.findValuesByOptionIds(optionIds);

    // Build a map of valid valueId -> optionId
    const valueToOption = new Map<string, string>();
    for (const [optionId, values] of valuesByOption) {
      for (const value of values) {
        valueToOption.set(value.id, optionId);
      }
    }

    for (const link of links) {
      const expectedOptionId = valueToOption.get(link.optionValueId);
      if (!expectedOptionId) {
        return singleError(
          `Option value ${link.optionValueId} not found`,
          "INVALID_OPTION_VALUE",
          ["links", "optionValueId"]
        );
      }
      if (expectedOptionId !== link.optionId) {
        return singleError(
          `Option value ${link.optionValueId} does not belong to option ${link.optionId}`,
          "INVALID_OPTION_VALUE",
          ["links", "optionValueId"]
        );
      }
    }

    // Check for duplicate options (same optionId linked twice)
    const seenOptions = new Set<string>();
    for (const link of links) {
      if (seenOptions.has(link.optionId)) {
        return singleError(
          `Duplicate option ${link.optionId} in links`,
          "DUPLICATE_OPTION",
          ["links"]
        );
      }
      seenOptions.add(link.optionId);
    }

    // Get current links to compare
    const currentLinksMap =
      await this.repository.option.findVariantLinks([variantId]);
    const currentLinks = currentLinksMap.get(variantId) ?? [];

    // Check if links actually changed
    const currentLinkSet = new Set(
      currentLinks.map((l) => `${l.optionId}:${l.optionValueId}`)
    );
    const newLinkSet = new Set(
      links.map((l) => `${l.optionId}:${l.optionValueId}`)
    );

    const linksChanged =
      currentLinkSet.size !== newLinkSet.size ||
      [...currentLinkSet].some((key) => !newLinkSet.has(key));

    if (!linksChanged) {
      this.logger.debug({ variantId }, "No option changes detected");
      return unchangedResult(existingVariant);
    }

    // Clear existing links and set new ones
    await this.repository.option.clearVariantLinks(variantId);
    for (const link of links) {
      await this.repository.option.linkVariant(
        variantId,
        link.optionId,
        link.optionValueId
      );
    }

    // Build new handle from option values
    const newHandle = await buildVariantHandle(
      this.repository.db,
      variantId,
      projectId
    );

    // Non-default variants must have a non-empty handle
    if (!existingVariant.isDefault && newHandle === "") {
      // Rollback link changes
      await this.repository.option.clearVariantLinks(variantId);
      for (const link of currentLinks) {
        if (link.optionValueId) {
          await this.repository.option.linkVariant(
            variantId,
            link.optionId,
            link.optionValueId
          );
        }
      }
      return singleError(
        "Non-default variant must have at least one option value",
        "INVALID_OPTIONS",
        ["links"]
      );
    }

    // Update handle if changed
    if (newHandle !== existingVariant.handle) {
      try {
        await this.repository.variant.update(variantId, { handle: newHandle });
      } catch (error) {
        if (isUniqueViolation(error, "variant_product_id_handle_key")) {
          // Rollback link changes by restoring previous links
          await this.repository.option.clearVariantLinks(variantId);
          for (const link of currentLinks) {
            if (link.optionValueId) {
              await this.repository.option.linkVariant(
                variantId,
                link.optionId,
                link.optionValueId
              );
            }
          }

          return singleError(
            "Another variant with the same option combination already exists",
            "DUPLICATE_OPTIONS",
            ["links"]
          );
        }
        throw error;
      }
    }

    // Build changes for event payload
    const changes: OptionLinkChanges[] = links.map((l) => ({
      optionId: l.optionId,
      valueId: l.optionValueId,
    }));

    this.logger.info(
      { variantId, linkCount: links.length, newHandle },
      "Variant options updated successfully"
    );

    return successResult(existingVariant, changes);
  }

  protected handleError(error: unknown): VariantUpdateOptionsResult {
    const msg = error instanceof Error ? error.message : String(error);
    this.logger.error({ error, msg }, "VariantUpdateOptionsScript failed");
    return {
      result: null,
      changes: null,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
