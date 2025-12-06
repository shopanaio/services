import type { TransactionScript } from "../../kernel/types.js";
import type { ProductOption } from "../../repositories/models/index.js";
import { getContext } from "../../context/index.js";
import type { ProductOptionSwatchInput, ProductOptionValueInput } from "./productOptionCreate.js";

export interface ProductOptionValueUpdateInput {
  readonly id: string;
  readonly slug?: string;
  readonly name?: string;
  readonly swatch?: ProductOptionSwatchInput | null;
}

export interface ProductOptionValuesInput {
  readonly create?: ProductOptionValueInput[];
  readonly update?: ProductOptionValueUpdateInput[];
  readonly delete?: string[];
}

export interface ProductOptionUpdateParams {
  readonly id: string;
  readonly slug?: string;
  readonly name?: string;
  readonly displayType?: string;
  readonly values?: ProductOptionValuesInput;
}

export interface ProductOptionUpdateResult {
  option?: ProductOption;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productOptionUpdate: TransactionScript<
  ProductOptionUpdateParams,
  ProductOptionUpdateResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { id, slug, name, displayType, values } = params;

    // 1. Check if option exists
    const existingOption = await repository.option.findById(id);
    if (!existingOption) {
      return {
        option: undefined,
        userErrors: [
          {
            message: "Option not found",
            field: ["id"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 2. Check if new slug is unique (if changing)
    if (slug !== undefined && slug !== existingOption.slug) {
      const optionWithSlug = await repository.option.findBySlug(
        existingOption.productId,
        slug
      );
      if (optionWithSlug) {
        return {
          option: undefined,
          userErrors: [
            {
              message: `Option with slug "${slug}" already exists for this product`,
              field: ["slug"],
              code: "SLUG_ALREADY_EXISTS",
            },
          ],
        };
      }
    }

    // 3. Update option
    const updateData: { slug?: string; displayType?: string } = {};
    if (slug !== undefined) updateData.slug = slug;
    if (displayType !== undefined) updateData.displayType = displayType;

    if (Object.keys(updateData).length > 0) {
      await repository.option.update(id, updateData);
    }

    // 4. Update translation if name provided
    if (name !== undefined) {
      const locale = getContext().locale ?? "uk";
      await repository.translation.upsertOptionTranslation({
        projectId: getContext().project.id,
        optionId: id,
        locale,
        name,
      });
    }

    // 5. Handle values updates
    if (values) {
      const locale = getContext().locale ?? "uk";

      // Delete values
      if (values.delete && values.delete.length > 0) {
        for (const valueId of values.delete) {
          await repository.option.deleteValue(valueId);
        }
      }

      // Update existing values
      if (values.update && values.update.length > 0) {
        for (const valueUpdate of values.update) {
          const valueUpdateData: { slug?: string; swatchId?: string | null } = {};

          if (valueUpdate.slug !== undefined) {
            valueUpdateData.slug = valueUpdate.slug;
          }

          // Handle swatch update
          if (valueUpdate.swatch !== undefined) {
            if (valueUpdate.swatch === null) {
              // Remove swatch
              valueUpdateData.swatchId = null;
            } else {
              // Create or update swatch
              const swatch = await repository.option.createSwatch({
                swatchType: valueUpdate.swatch.swatchType,
                colorOne: valueUpdate.swatch.colorOne ?? null,
                colorTwo: valueUpdate.swatch.colorTwo ?? null,
                imageId: valueUpdate.swatch.fileId ?? null,
                metadata: valueUpdate.swatch.metadata ?? null,
              });
              valueUpdateData.swatchId = swatch.id;
            }
          }

          if (Object.keys(valueUpdateData).length > 0) {
            await repository.option.updateValue(valueUpdate.id, valueUpdateData);
          }

          // Update translation
          if (valueUpdate.name !== undefined) {
            await repository.translation.upsertOptionValueTranslation({
              projectId: getContext().project.id,
              optionValueId: valueUpdate.id,
              locale,
              name: valueUpdate.name,
            });
          }
        }
      }

      // Create new values
      if (values.create && values.create.length > 0) {
        // Get current max sort index
        const existingValues = await repository.option.findValuesByOptionId(id);
        let sortIndex = existingValues.length > 0
          ? Math.max(...existingValues.map((v) => v.sortIndex)) + 1
          : 0;

        for (const valueInput of values.create) {
          let swatchId: string | null = null;

          // Create swatch if provided
          if (valueInput.swatch) {
            const swatch = await repository.option.createSwatch({
              swatchType: valueInput.swatch.swatchType,
              colorOne: valueInput.swatch.colorOne ?? null,
              colorTwo: valueInput.swatch.colorTwo ?? null,
              imageId: valueInput.swatch.fileId ?? null,
              metadata: valueInput.swatch.metadata ?? null,
            });
            swatchId = swatch.id;
          }

          // Create option value
          const optionValue = await repository.option.createValue(id, {
            slug: valueInput.slug,
            sortIndex,
            swatchId,
          });

          // Create option value translation
          await repository.translation.upsertOptionValueTranslation({
            projectId: getContext().project.id,
            optionValueId: optionValue.id,
            locale,
            name: valueInput.name,
          });

          sortIndex++;
        }
      }
    }

    // 6. Fetch updated option
    const option = await repository.option.findById(id);

    logger.info({ optionId: id }, "Product option updated successfully");

    return {
      option: option ?? undefined,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "productOptionUpdate failed");
    return {
      option: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
