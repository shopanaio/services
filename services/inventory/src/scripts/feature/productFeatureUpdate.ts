import type { TransactionScript } from "../../kernel/types.js";
import type { ProductFeature } from "../../repositories/models/index.js";
import { getContext } from "../../context/index.js";
import type { ProductFeatureValueInput } from "./productFeatureCreate.js";

export interface ProductFeatureValueUpdateInput {
  readonly id: string;
  readonly slug?: string;
  readonly name?: string;
}

export interface ProductFeatureValuesInput {
  readonly create?: ProductFeatureValueInput[];
  readonly update?: ProductFeatureValueUpdateInput[];
  readonly delete?: string[];
}

export interface ProductFeatureUpdateParams {
  readonly id: string;
  readonly slug?: string;
  readonly name?: string;
  readonly values?: ProductFeatureValuesInput;
}

export interface ProductFeatureUpdateResult {
  feature?: ProductFeature;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productFeatureUpdate: TransactionScript<
  ProductFeatureUpdateParams,
  ProductFeatureUpdateResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { id, slug, name, values } = params;

    // 1. Check if feature exists
    const existingFeature = await repository.feature.findById(id);
    if (!existingFeature) {
      return {
        feature: undefined,
        userErrors: [
          {
            message: "Feature not found",
            field: ["id"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 2. Check if new slug is unique (if changing)
    if (slug !== undefined && slug !== existingFeature.slug) {
      const featureWithSlug = await repository.feature.findBySlug(
        existingFeature.productId,
        slug
      );
      if (featureWithSlug) {
        return {
          feature: undefined,
          userErrors: [
            {
              message: `Feature with slug "${slug}" already exists for this product`,
              field: ["slug"],
              code: "SLUG_ALREADY_EXISTS",
            },
          ],
        };
      }
    }

    // 3. Update feature
    if (slug !== undefined) {
      await repository.feature.update(id, { slug });
    }

    // 4. Update translation if name provided
    if (name !== undefined) {
      const locale = getContext().locale ?? "uk";
      await repository.translation.upsertFeatureTranslation({
        projectId: getContext().project.id,
        featureId: id,
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
          await repository.feature.deleteValue(valueId);
        }
      }

      // Update existing values
      if (values.update && values.update.length > 0) {
        for (const valueUpdate of values.update) {
          if (valueUpdate.slug !== undefined) {
            await repository.feature.updateValue(valueUpdate.id, {
              slug: valueUpdate.slug,
            });
          }

          // Update translation
          if (valueUpdate.name !== undefined) {
            await repository.translation.upsertFeatureValueTranslation({
              projectId: getContext().project.id,
              featureValueId: valueUpdate.id,
              locale,
              name: valueUpdate.name,
            });
          }
        }
      }

      // Create new values
      if (values.create && values.create.length > 0) {
        // Get current max sort index
        const existingValues = await repository.feature.findValuesByFeatureId(id);
        let sortIndex = existingValues.length > 0
          ? Math.max(...existingValues.map((v) => v.sortIndex)) + 1
          : 0;

        for (const valueInput of values.create) {
          // Create feature value
          const featureValue = await repository.feature.createValue(id, {
            slug: valueInput.slug,
            sortIndex,
          });

          // Create feature value translation
          await repository.translation.upsertFeatureValueTranslation({
            projectId: getContext().project.id,
            featureValueId: featureValue.id,
            locale,
            name: valueInput.name,
          });

          sortIndex++;
        }
      }
    }

    // 6. Fetch updated feature
    const feature = await repository.feature.findById(id);

    logger.info({ featureId: id }, "Product feature updated successfully");

    return {
      feature: feature ?? undefined,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "productFeatureUpdate failed");
    return {
      feature: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
