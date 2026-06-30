import { expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

import type { ApiProduct, ApiVariant, ApiCategory, ApiProductFeature, ApiProductMutationCreateArgs, ApiProductMutationUpdateArgs, ApiDescriptionFieldsInput, ApiCreateProductGroupInput, ApiCreateProductVariantInput } from '@codegen/admin-gql';

import {
  productSchema,
  variantSchema,
  categorySchema,
  productItemSchema,
  productFeatureSchema,
} from 'schema/schema';
import type { TenantApiFixture } from '@fixtures/admin/api';
import _ from 'lodash';
import type { DeepPartial } from 'types';
import { slugify } from '@utils/transliterate';

type EntityStatus = 'DRAFT' | 'PUBLISHED';

export class Product {
  constructor(private api: TenantApiFixture) {}

  assertProduct = (product: ApiProduct) => {
    expect(() => productSchema.validateSync(product)).not.toThrow();
  };

  assertProducts = (products: ApiProduct[]) => {
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);
    products.forEach(this.assertProduct);
  };

  assertVariant = (variant: ApiVariant) => {
    expect(() => variantSchema.validateSync(variant)).not.toThrow();
  };

  assertCategory = (category: ApiCategory) => {
    expect(() => categorySchema.validateSync(category)).not.toThrow();
  };

  assertProductItem = (productItem: ApiVariant) => {
    expect(() => productItemSchema.validateSync(productItem)).not.toThrow();
  };

  assertFeature = (feature: ApiProductFeature) => {
    expect(() => productFeatureSchema.validateSync(feature)).not.toThrow();
  };

  create = async (variables?: DeepPartial<ApiProductMutationCreateArgs>): Promise<ApiProduct> => {
    const vars = _.merge(
      {
        input: {
          description: null,
          excerpt: '',
          groups: [],
          requiresShipping: false,
          slug: `${randomUUID()}`,
          status: 'PUBLISHED',
          tags: [],
          title: 'Product',
          variants: {
            create: [
              {
                categories: [],
                costPrice: 0,
                coverId: null,
                features: [],
                gallery: [],
                inListing: true,
                oldPrice: 0,
                price: 0,
                sku: '',
                slug: `${randomUUID()}`,
                stockStatus: 'OUT_OF_STOCK',
                title: 'Product',
                variantSortIndex: 0,
                weight: 0,
                weightUnit: 'g',
                width: 0,
                height: 0,
                length: 0,
                dimensionUnit: 'cm',
              },
            ],
          },
        },
      },
      variables,
    );

    const { data } = await this.api.mutation('admin/ProductCreate', {
      variables: vars,
    });

    return this.findOne(data.productMutation.create.id);
  };

  createMany = async (
    products: DeepPartial<ApiProductMutationCreateArgs>[],
  ): Promise<boolean[]> => {
    const inputs = products.map((variables) =>
      _.merge(
        {
          description: null,
          excerpt: '',
          groups: [],
          requiresShipping: false,
          slug: null,
          status: 'PUBLISHED',
          tags: [],
          title: 'Product',
          variants: {
            create: [
              {
                categories: [],
                costPrice: 0,
                coverId: null,
                features: [],
                gallery: [],
                inListing: true,
                oldPrice: 0,
                price: 0,
                sku: '',
                slug: null,
                stockStatus: 'OUT_OF_STOCK',
                title: 'Product',
                variantSortIndex: 0,
                weight: 0,
                weightUnit: 'g',
                width: 0,
                height: 0,
                length: 0,
                dimensionUnit: 'cm',
              },
            ],
          },
        },
        variables?.input || {},
      ),
    );

    const { data } = await this.api.mutation('admin/ProductCreateMany', {
      variables: { input: inputs },
    });

    return data.productMutation.createMany;
  };

  update = async (variables: ApiProductMutationUpdateArgs): Promise<ApiProduct> => {
    const { data } = await this.api.mutation('admin/ProductUpdate', {
      variables,
    });
    return this.findOne(data.productMutation.update.id);
  };

  findOne = async (id: string): Promise<ApiProduct> => {
    const { data: productData } = await this.api.query('admin/ProductFindOne', {
      variables: { id },
    });

    return productData.productQuery.findOne as ApiProduct;
  };

  /**
   * ```ts
   * await api.admin.product.createWithOptions({
   *   title: 'T-Shirt',
   *   options: [
   *     { title: 'Color', values: ['Red', 'Blue'] },
   *     { title: 'Size', values: ['M', 'L'] },
   *   ],
   * });
   * ```
   */
  createWithOptions = async ({
    title,
    options,
    price = 0,
    status = 'DRAFT',
    slug,
    requiresShipping = false,
    description = null,
    excerpt = '',
  }: {
    title: string;
    options: { title: string; slug?: string; values: string[] }[];
    price?: number;
    status?: EntityStatus;
    slug?: string;
    requiresShipping?: boolean;
    description?: ApiDescriptionFieldsInput | null;
    excerpt?: string;
  }): Promise<ApiProduct> => {

    type FeatureEntity = {
      title: string;
      slug: string;
      groupTitle: string;
      groupSlug: string;
    };

    const featuresMatrix: FeatureEntity[][] = options.map((option) => {
      const groupSlug = option.slug ?? slugify(option.title);
      return option.values.map((value) => ({
        title: value,
        slug: `${groupSlug}.${slugify(value)}`,
        groupTitle: option.title,
        groupSlug,
      }));
    });

    const cartesianProduct = <T>(matrix: T[][]): T[][] =>
      matrix.reduce<T[][]>((acc, cur) => acc.flatMap((a) => cur.map((b) => [...a, b])), [[]]);

    const combinations = cartesianProduct<FeatureEntity>(featuresMatrix);

    const containerSlug = slug ?? randomUUID();

    const variantsToCreate: ApiCreateProductVariantInput[] = combinations.map(
      (combo: FeatureEntity[], comboIndex: number) => ({
        categories: [] as string[],
        costPrice: 0,
        coverId: null,
        features: combo.map((feat: FeatureEntity, idx: number) => ({
          attributeSortIndex: idx,
          isAttribute: true,
          isOption: true,
          optionSortIndex: idx,
          title: feat.title,
          slug: feat.slug,
          group: {
            title: feat.groupTitle,
            slug: feat.groupSlug,
            featureStyleType: 'RADIO',
          },
        })),
        gallery: [],
        inListing: true,
        oldPrice: 0,
        price,
        sku: '',
        slug: `${containerSlug}_${combo.map((f: FeatureEntity) => f.slug).join('_')}`,
        stockStatus: 'IN_STOCK',
        title: combo.map((f: FeatureEntity) => f.title).join(' '),
        variantSortIndex: comboIndex,
        weight: 0,
        weightUnit: 'g',
        width: 0,
        height: 0,
        length: 0,
        dimensionUnit: 'cm',
      }),
    );

    const createInput = {
      description,
      excerpt,
      groups: [] as ApiCreateProductGroupInput[],
      requiresShipping,
      slug: containerSlug,
      status,
      tags: [] as string[],
      title,
      variants: {
        create: variantsToCreate,
      },
    } as const;

    const { data } = await this.api.mutation<ApiProductMutationCreateArgs>('admin/ProductCreate', {
      variables: { input: createInput },
    });

    return this.findOne(data.productMutation.create.id);
  };

  getDefaultVariantInput = (input: DeepPartial<ApiCreateProductVariantInput>) => {
    return _.merge(
      {
        categories: [],
        costPrice: 0,
        coverId: null,
        features: [],
        gallery: [],
        inListing: true,
        oldPrice: 0,
        price: 0,
        sku: '',
        slug: null,
        stockStatus: 'OUT_OF_STOCK',
        title: 'Product',
        variantSortIndex: 0,
        weight: 0,
        weightUnit: 'g',
        width: 0,
        height: 0,
        length: 0,
        dimensionUnit: 'cm',
      },
      input,
    );
  };
}
