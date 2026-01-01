import { getDescriptionSchema, getSlugSchema } from '@src/schemas/shared';
import * as yup from 'yup';

import { IProductFormValues } from '@modules/products/types';
import { uniqBy } from 'lodash';
import {
  getProductCategoriesSchema,
  getProductLinksSchema,
  getProductMediaSchema,
  getProductPricingSchema,
  getProductStockSchema,
  getProductTagsSchema,
} from './schemas';

const skipCheck = true;
const withTests = (schema: yup.ObjectSchema<IProductFormValues>) => {
  return schema
    .test('variant-sku', 'Each variant must have a unique sku', (value) => {
      const { variants } = value;

      if (variants?.length) {
        const withSku = variants.filter((it) => it.sku?.trim()?.length);
        return uniqBy(withSku, 'sku').length === withSku.length;
      }

      return true;
    })
    .test('variant-slug', 'Each variant must have a unique slug', (value) => {
      const { variants } = value;

      if (variants?.length) {
        return uniqBy(variants, 'slug').length === variants.length;
      }

      return true;
    })
    .test(
      'dimensions-complete',
      'Length, width and height must be all greater than 0 or all equal to 0',
      (value) => {
        if (!value) {
          return true;
        }

        const validateDims = (
          requiresShipping: boolean,
          length?: number,
          width?: number,
          height?: number,
        ) => {
          if (!requiresShipping) {
            // Shipping disabled, skip validation
            return true;
          }

          const dims = [length || 0, width || 0, height || 0];
          const filled = dims.filter((d) => d && d > 0);

          if (filled.length === 0) {
            return true; // all are 0
          }

          return dims.every((d) => typeof d === 'number' && d > 0);
        };

        // Validate product-level dimensions first
        if (
          !validateDims(
            value.requiresShipping,
            (value as any).length,
            (value as any).width,
            (value as any).height,
          )
        ) {
          return false;
        }

        // If shipping fields are enabled for variants, validate each variant
        if (Array.isArray(value.variants)) {
          for (const variant of value.variants) {
            if (
              !validateDims(
                variant.requiresShipping,
                variant.length,
                variant.width,
                variant.height,
              )
            ) {
              return false;
            }
          }
        }

        return true;
      },
    );
};

export const getCreateProductSchema = () => {
  return withTests(
    yup.object({
      title: yup.string().required('Title is required'),
      description: getDescriptionSchema(),
      seoTitle: yup.string().nullable(),
      seoDescription: yup.string().nullable(),
      excerpt: yup.string(),
      ...getSlugSchema(),
      ...getProductPricingSchema(),
      ...getProductStockSchema(),
      ...getProductCategoriesSchema(),
      ...getProductTagsSchema(),
      ...getProductMediaSchema(),
      variants: yup.array().when('options', ([options], schema) => {
        if (options.length) {
          return schema
            .of(getCreateVariantSchema())
            .min(1, "Variants can't be empty");
        }

        return yup.array().notRequired();
      }),
    }) as any,
  );
};

export const getEditProductSchema = () => {
  return withTests(
    yup.object({
      title: yup.string(),
      description: getDescriptionSchema(),
      seoTitle: yup.string().nullable(),
      seoDescription: yup.string().nullable(),
      excerpt: yup.string(),
      ...getProductPricingSchema(),
      ...getSlugSchema(),
      ...getProductStockSchema(),
      ...getProductCategoriesSchema(),
      ...getProductTagsSchema(),
      ...getProductLinksSchema(),
      ...getProductMediaSchema(),
      variants: yup.array().when('options', ([options], schema) => {
        if (options.length) {
          return schema
            .of(getCreateVariantSchema())
            .min(1, "Variants can't be empty");
        }

        return yup.array().notRequired();
      }),
    }) as any,
  );
};

export const getCreateVariantSchema = () => {
  return yup.object({
    title: yup.string(),
    ...getSlugSchema(),
  });
};

export const getEditVariantSchema = () => {
  return yup.object({
    // TODO: Fill this schema
  });
};
