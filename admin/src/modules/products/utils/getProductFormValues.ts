import { defaultProductFormValues as defaultFormValues } from '@modules/products/defs';
import { IProductFormValues } from '@modules/products/types';
import { getDescriptionFields } from '@src/entity/Content/description';
import { IProduct } from '@src/entity/Product/Product';

export const getProductFormValues = (product: IProduct): IProductFormValues => {
  return {
    id: product.id,
    attributes: product.attributes,
    categories: product.categories,
    costPrice: product.costPrice || defaultFormValues.costPrice,
    primaryCategoryId: product.primaryCategory?.id || null,
    cover: product.cover || null,
    description: getDescriptionFields(product.description),
    excerpt: product.excerpt || defaultFormValues.excerpt,
    gallery: product.gallery,
    oldPrice: product.oldPrice || defaultFormValues.oldPrice,
    options: product.options,
    price: product.price || defaultFormValues.price,
    requiresShipping: product.requiresShipping,
    sku: product.sku || defaultFormValues.sku,
    slug: product.slug,
    seoTitle: product.seoTitle || defaultFormValues.seoTitle,
    seoDescription: product.seoDescription || defaultFormValues.seoDescription,
    status: product.status,
    stockStatus: product.stockStatus || defaultFormValues.stockStatus,
    tags: product.tags || [],
    title: product.title,
    weight: product.weight || defaultFormValues.weight,
    weightUnit: product.weightUnit || defaultFormValues.weightUnit,
    length: product.length || defaultFormValues.length,
    width: product.width || defaultFormValues.width,
    height: product.height || defaultFormValues.height,
    dimensionUnit: product.dimensionUnit || defaultFormValues.dimensionUnit,
    groups: product.groups.map((group) => ({
      id: group.id,
      title: group.title,
      isMultiple: !!group.isMultiple,
      isRequired: !!group.isRequired,
      items: group.items,
    })),
    // @ts-expect-error using variants
    variants: product.variants,
  };
};
