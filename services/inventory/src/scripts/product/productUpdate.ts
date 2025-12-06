import type { TransactionScript } from "../../kernel/types.js";
import type { Product } from "../../repositories/models/index.js";
import { getContext } from "../../context/index.js";

export interface ProductUpdateParams {
  readonly id: string;
  readonly title?: string;
  readonly description?: {
    text: string;
    html: string;
    json: Record<string, unknown>;
  };
  readonly excerpt?: string;
  readonly seoTitle?: string;
  readonly seoDescription?: string;
}

export interface ProductUpdateResult {
  product?: Product;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const productUpdate: TransactionScript<
  ProductUpdateParams,
  ProductUpdateResult
> = async (params, services) => {
  const { logger, repository } = services;

  try {
    const { id, title, description, excerpt, seoTitle, seoDescription } = params;

    // 1. Check if product exists
    const existingProduct = await repository.product.findById(id);
    if (!existingProduct) {
      return {
        product: undefined,
        userErrors: [
          {
            message: "Product not found",
            field: ["id"],
            code: "NOT_FOUND",
          },
        ],
      };
    }

    // 2. Update translation if any translation fields provided
    const hasTranslationUpdate =
      title !== undefined ||
      description !== undefined ||
      excerpt !== undefined ||
      seoTitle !== undefined ||
      seoDescription !== undefined;

    if (hasTranslationUpdate) {
      const locale = getContext().locale ?? "uk";

      // Get existing translation to merge with updates
      const existingTranslation = await repository.translation.getProductTranslation(id, locale);

      await repository.translation.upsertProductTranslation({
        projectId: getContext().project.id,
        productId: id,
        locale,
        title: title ?? existingTranslation?.title ?? "",
        descriptionText: description?.text ?? existingTranslation?.descriptionText ?? null,
        descriptionHtml: description?.html ?? existingTranslation?.descriptionHtml ?? null,
        descriptionJson: description?.json ?? existingTranslation?.descriptionJson ?? null,
        excerpt: excerpt ?? existingTranslation?.excerpt ?? null,
        seoTitle: seoTitle ?? existingTranslation?.seoTitle ?? null,
        seoDescription: seoDescription ?? existingTranslation?.seoDescription ?? null,
      });
    }

    // 3. Touch product to update updatedAt
    await repository.product.touch(id);

    // 4. Fetch updated product
    const product = await repository.product.findById(id);

    logger.info({ productId: id }, "Product updated successfully");

    return {
      product: product ?? undefined,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "productUpdate failed");
    return {
      product: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
