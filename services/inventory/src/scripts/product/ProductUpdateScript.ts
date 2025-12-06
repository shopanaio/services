import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { Product } from "../../repositories/models/index.js";
import { FeatureCreateScript, type FeatureValueInput } from "../feature/FeatureCreateScript.js";
import { FeatureUpdateScript, type FeatureValuesInput } from "../feature/FeatureUpdateScript.js";
import { FeatureDeleteScript } from "../feature/FeatureDeleteScript.js";
import { OptionCreateScript, type OptionValueInput } from "../option/OptionCreateScript.js";
import { OptionUpdateScript, type OptionValuesInput } from "../option/OptionUpdateScript.js";
import { OptionDeleteScript } from "../option/OptionDeleteScript.js";

export interface DescriptionInput {
  readonly text: string;
  readonly html: string;
  readonly json: Record<string, unknown>;
}

export interface FeatureInput {
  readonly slug: string;
  readonly name: string;
  readonly values: FeatureValueInput[];
}

export interface FeatureUpdateInput {
  readonly id: string;
  readonly slug?: string;
  readonly name?: string;
  readonly values?: FeatureValuesInput;
}

export interface FeaturesInput {
  readonly create?: FeatureInput[];
  readonly update?: FeatureUpdateInput[];
  readonly delete?: string[];
}

export interface OptionInput {
  readonly slug: string;
  readonly name: string;
  readonly displayType: string;
  readonly values: OptionValueInput[];
}

export interface OptionUpdateInput {
  readonly id: string;
  readonly slug?: string;
  readonly name?: string;
  readonly displayType?: string;
  readonly values?: OptionValuesInput;
}

export interface OptionsInput {
  readonly create?: OptionInput[];
  readonly update?: OptionUpdateInput[];
  readonly delete?: string[];
}

export interface ProductUpdateParams {
  readonly id: string;
  readonly title?: string;
  readonly description?: DescriptionInput;
  readonly excerpt?: string;
  readonly seoTitle?: string;
  readonly seoDescription?: string;
  readonly features?: FeaturesInput;
  readonly options?: OptionsInput;
}

export interface ProductUpdateResult {
  product?: Product;
  userErrors: UserError[];
}

export class ProductUpdateScript extends BaseScript<ProductUpdateParams, ProductUpdateResult> {
  protected async execute(params: ProductUpdateParams): Promise<ProductUpdateResult> {
    const { id, title, description, excerpt, seoTitle, seoDescription, features, options } = params;

    // 1. Check if product exists
    const existingProduct = await this.repository.product.findById(id);
    if (!existingProduct) {
      return {
        product: undefined,
        userErrors: [{ message: "Product not found", field: ["id"], code: "NOT_FOUND" }],
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
      const locale = this.getLocale();
      const existingTranslation = await this.repository.translation.getProductTranslation(id, locale);

      await this.repository.translation.upsertProductTranslation({
        projectId: this.getProjectId(),
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

    // 3. Handle features updates
    if (features) {
      const errors = await this.processFeaturesUpdate(id, features);
      if (errors.length > 0) {
        return { product: undefined, userErrors: errors };
      }
    }

    // 4. Handle options updates
    if (options) {
      const errors = await this.processOptionsUpdate(id, options);
      if (errors.length > 0) {
        return { product: undefined, userErrors: errors };
      }
    }

    // 5. Touch product to update updatedAt
    await this.repository.product.touch(id);

    // 6. Fetch updated product
    const product = await this.repository.product.findById(id);

    this.logger.info({ productId: id }, "Product updated");

    return { product: product ?? undefined, userErrors: [] };
  }

  private async processFeaturesUpdate(
    productId: string,
    features: FeaturesInput
  ): Promise<UserError[]> {
    // Delete features
    if (features.delete?.length) {
      for (const featureId of features.delete) {
        const result = await this.executeScript(FeatureDeleteScript, { id: featureId });
        if (result.userErrors.length > 0) {
          return result.userErrors;
        }
      }
    }

    // Update existing features
    if (features.update?.length) {
      for (const featureUpdate of features.update) {
        const result = await this.executeScript(FeatureUpdateScript, {
          id: featureUpdate.id,
          slug: featureUpdate.slug,
          name: featureUpdate.name,
          values: featureUpdate.values,
        });
        if (result.userErrors.length > 0) {
          return result.userErrors;
        }
      }
    }

    // Create new features
    if (features.create?.length) {
      for (const featureInput of features.create) {
        const result = await this.executeScript(FeatureCreateScript, {
          productId,
          slug: featureInput.slug,
          name: featureInput.name,
          values: featureInput.values,
        });
        if (result.userErrors.length > 0) {
          return result.userErrors;
        }
      }
    }

    return [];
  }

  private async processOptionsUpdate(
    productId: string,
    options: OptionsInput
  ): Promise<UserError[]> {
    // Delete options
    if (options.delete?.length) {
      for (const optionId of options.delete) {
        const result = await this.executeScript(OptionDeleteScript, { id: optionId });
        if (result.userErrors.length > 0) {
          return result.userErrors;
        }
      }
    }

    // Update existing options
    if (options.update?.length) {
      for (const optionUpdate of options.update) {
        const result = await this.executeScript(OptionUpdateScript, {
          id: optionUpdate.id,
          slug: optionUpdate.slug,
          name: optionUpdate.name,
          displayType: optionUpdate.displayType,
          values: optionUpdate.values,
        });
        if (result.userErrors.length > 0) {
          return result.userErrors;
        }
      }
    }

    // Create new options
    if (options.create?.length) {
      for (const optionInput of options.create) {
        const result = await this.executeScript(OptionCreateScript, {
          productId,
          slug: optionInput.slug,
          name: optionInput.name,
          displayType: optionInput.displayType,
          values: optionInput.values,
        });
        if (result.userErrors.length > 0) {
          return result.userErrors;
        }
      }
    }

    return [];
  }

  protected handleError(_error: unknown): ProductUpdateResult {
    return {
      product: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
