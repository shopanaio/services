import { BaseScript } from "../../kernel/BaseScript.js";
import type {
  ProductCreateParams,
  ProductCreateResult,
  ProductCreateOptionInput,
  ProductCreateVariantInput,
} from "./dto/index.js";
import type { Variant, ProductOptionValue } from "../../repositories/models/index.js";

export class ProductCreateScript extends BaseScript<ProductCreateParams, ProductCreateResult> {
  protected async execute(params: ProductCreateParams): Promise<ProductCreateResult> {
    const { title, handle, description, mediaFileIds, options, variants } = params;

    // 1. Create product with handle
    const product = await this.repository.product.create({});
    await this.repository.product.update(product.id, { handle });

    // 2. Create product translation (title, description)
    await this.repository.translation.upsertProductTranslation({
      projectId: this.getProjectId(),
      productId: product.id,
      locale: this.getLocale(),
      title,
      descriptionText: description?.text ?? null,
      descriptionHtml: description?.html ?? null,
      descriptionJson: description?.json ?? null,
      excerpt: null,
      seoTitle: null,
      seoDescription: null,
    });

    let createdVariants: Variant[] = [];

    // 3. Handle options and variants
    if (options && options.length > 0 && variants && variants.length > 0) {
      // Create options and collect option values for variant linking
      const optionValuesBySlug = await this.createOptionsWithValues(product.id, options);

      // Create variants
      createdVariants = await this.createVariants(
        product.id,
        variants,
        optionValuesBySlug,
        options,
        mediaFileIds
      );
    } else {
      // No options - create default variant
      const defaultVariant = await this.repository.variant.create(product.id, {
        isDefault: true,
        handle: "",
      });
      createdVariants = [defaultVariant];

      // Attach media to default variant
      if (mediaFileIds && mediaFileIds.length > 0) {
        await this.repository.media.setVariantMedia(defaultVariant.id, mediaFileIds);
      }
    }

    // 4. Fetch updated product
    const updatedProduct = await this.repository.product.findById(product.id);

    this.logger.info(
      {
        productId: product.id,
        variantsCount: createdVariants.length,
        optionsCount: options?.length ?? 0,
      },
      "Product created"
    );

    return {
      product: updatedProduct
        ? { ...updatedProduct, _variants: createdVariants }
        : undefined,
      userErrors: [],
    };
  }

  /**
   * Creates options and their values, returns a map of slug -> optionValue
   */
  private async createOptionsWithValues(
    productId: string,
    options: ProductCreateOptionInput[]
  ): Promise<Map<string, { optionId: string; valueId: string }>> {
    const optionValuesBySlug = new Map<string, { optionId: string; valueId: string }>();

    for (const optionInput of options) {
      // Create option
      const option = await this.repository.option.create(productId, {
        slug: optionInput.slug,
        displayType: optionInput.displayType ?? "DROPDOWN",
      });

      // Create option translation
      await this.repository.translation.upsertOptionTranslation({
        projectId: this.getProjectId(),
        optionId: option.id,
        locale: this.getLocale(),
        name: optionInput.name,
      });

      // Create option values
      for (let i = 0; i < optionInput.values.length; i++) {
        const valueInput = optionInput.values[i];

        const optionValue = await this.repository.option.createValue(option.id, {
          slug: valueInput.slug,
          sortIndex: i,
        });

        // Create value translation
        await this.repository.translation.upsertOptionValueTranslation({
          projectId: this.getProjectId(),
          optionValueId: optionValue.id,
          locale: this.getLocale(),
          name: valueInput.name,
        });

        // Store for variant linking (key: "optionSlug:valueSlug")
        optionValuesBySlug.set(`${optionInput.slug}:${valueInput.slug}`, {
          optionId: option.id,
          valueId: optionValue.id,
        });
      }
    }

    return optionValuesBySlug;
  }

  /**
   * Creates variants and links them to option values
   */
  private async createVariants(
    productId: string,
    variants: ProductCreateVariantInput[],
    optionValuesBySlug: Map<string, { optionId: string; valueId: string }>,
    options: ProductCreateOptionInput[],
    mediaFileIds?: string[]
  ): Promise<Variant[]> {
    const createdVariants: Variant[] = [];

    for (let i = 0; i < variants.length; i++) {
      const variantInput = variants[i];
      const isFirst = i === 0;

      // Create variant
      const variant = await this.repository.variant.create(productId, {
        isDefault: isFirst,
        handle: variantInput.handle,
      });

      // Parse handle to get option value slugs (e.g., "red-s" -> ["red", "s"])
      const valueSlugs = variantInput.handle.split("-");

      // Link variant to option values
      for (let j = 0; j < options.length && j < valueSlugs.length; j++) {
        const optionSlug = options[j].slug;
        const valueSlug = valueSlugs[j];
        const key = `${optionSlug}:${valueSlug}`;

        const linkData = optionValuesBySlug.get(key);
        if (linkData) {
          await this.repository.option.linkVariant(
            variant.id,
            linkData.optionId,
            linkData.valueId
          );
        }
      }

      // Attach media to variant (all variants get the same media)
      if (mediaFileIds && mediaFileIds.length > 0) {
        await this.repository.media.setVariantMedia(variant.id, mediaFileIds);
      }

      createdVariants.push(variant);
    }

    return createdVariants;
  }

  protected handleError(_error: unknown): ProductCreateResult {
    return {
      product: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
