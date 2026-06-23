import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type {
  ProductCreateParams,
  ProductCreateResult,
  ProductCreateOptionInput,
  ProductCreateVariantInput,
} from "./dto/index.js";
import type { Variant } from "../../repositories/models/index.js";
import {
  serializeRichTextJson,
  toRichTextStorage,
} from "../shared/richText.js";

export class ProductCreateScript extends BaseScript<
  ProductCreateParams,
  ProductCreateResult
> {
  @Transactional()
  protected async execute(
    params: ProductCreateParams
  ): Promise<ProductCreateResult> {
    const {
      title,
      handle,
      vendorId,
      description,
      excerpt,
      mediaFileIds,
      options,
      variants,
    } = params;

    if (vendorId) {
      const vendor = await this.repository.vendor.findById(vendorId);
      if (!vendor) {
        return {
          product: undefined,
          userErrors: [
            {
              message: "Vendor not found",
              field: ["vendorId"],
              code: "MISSING_VENDOR",
            },
          ],
        };
      }
    }

    // 1. Create product with handle
    const product = await this.repository.product.create({ vendorId });
    await this.repository.product.update(product.id, { handle });
    const excerptStorage = toRichTextStorage(excerpt);

    // 2. Create product translation (name, description)
    await this.repository.translation.upsertProductTranslation({
      projectId: this.getProjectId(),
      productId: product.id,
      locale: this.getLocale(),
      name: title,
      descriptionText: description?.text ?? null,
      descriptionHtml: description?.html ?? null,
      descriptionJson: serializeRichTextJson(description?.json),
      excerptText: excerptStorage.text,
      excerptHtml: excerptStorage.html,
      excerptJson: excerptStorage.json,
    });

    const productMedia = mediaFileIds
      ? await this.repository.media.setProductMedia(product.id, mediaFileIds)
      : [];
    const productMediaFileIds = productMedia.map((media) => media.fileId);

    let createdVariants: Variant[] = [];

    // 3. Handle options and variants
    if (options && options.length > 0 && variants && variants.length > 0) {
      const orderedOptions = this.normalizeOptionSortIndexes(options);

      // Create options and collect option values for variant linking
      const optionValuesBySlug = await this.createOptionsWithValues(
        product.id,
        orderedOptions
      );

      // Create variants and collect media mapping
      const result = await this.createVariants(
        product.id,
        variants,
        optionValuesBySlug,
        orderedOptions
      );
      createdVariants = result;
    } else {
      // No options - create default variant
      const defaultVariant = await this.repository.variant.create(product.id, {
        isDefault: true,
        handle: "",
      });
      createdVariants = [defaultVariant];
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
      productMedia:
        productMediaFileIds.length > 0
          ? { productId: product.id, fileIds: productMediaFileIds }
          : undefined,
    };
  }

  /**
   * Creates options and their values, returns a map of slug -> optionValue
   */
  private normalizeOptionSortIndexes(
    options: ProductCreateOptionInput[]
  ): ProductCreateOptionInput[] {
    return options
      .map((option, inputIndex) => ({
        ...option,
        sortIndex: option.sortIndex ?? inputIndex,
        values: option.values.map((value, valueIndex) => ({
          ...value,
          sortIndex: value.sortIndex ?? valueIndex,
        })),
      }))
      .sort((left, right) => left.sortIndex - right.sortIndex);
  }

  private async createOptionsWithValues(
    productId: string,
    options: ProductCreateOptionInput[]
  ): Promise<Map<string, { optionId: string; valueId: string }>> {
    const optionValuesBySlug = new Map<
      string,
      { optionId: string; valueId: string }
    >();

    for (const optionInput of options) {
      // Create option
      const option = await this.repository.option.create(productId, {
        slug: optionInput.slug,
        displayType: optionInput.displayType ?? "DROPDOWN",
        sortIndex: optionInput.sortIndex ?? 0,
      });

      // Create option translation
      await this.repository.translation.upsertOptionTranslation({
        projectId: this.getProjectId(),
        optionId: option.id,
        locale: this.getLocale(),
        name: optionInput.name,
      });

      // Create option values
      const values = [...optionInput.values].sort(
        (left, right) => (left.sortIndex ?? 0) - (right.sortIndex ?? 0)
      );
      for (const valueInput of values) {

        const optionValue = await this.repository.option.createValue(
          option.id,
          {
            slug: valueInput.slug,
            sortIndex: valueInput.sortIndex ?? 0,
          }
        );

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
   * Creates variants and links them to option values.
   * Returns created variants and media mapping for back-ref sync.
   */
  private async createVariants(
    productId: string,
    variants: ProductCreateVariantInput[],
    optionValuesBySlug: Map<string, { optionId: string; valueId: string }>,
    options: ProductCreateOptionInput[]
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
