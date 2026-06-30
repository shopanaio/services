import type {
  ApiProduct,
  ApiProductCreateInput,
  ApiProductCreateOptionInput,
  ApiProductUpdateInput,
} from '@codegen/admin-gql';
import type { BaseGqlRequest } from '@fixtures/api/gqlRequest';
import { slugify } from '@utils/transliterate';

type ProductStatus = 'DRAFT' | 'PUBLISHED';
type UserError = { code: string; message: string; field?: string[] | null };

export interface ProductCreateWithOptionsInput {
  title: string;
  handle?: string;
  slug?: string;
  status?: ProductStatus;
  price?: number;
  mediaFileIds?: string[];
  options: { title?: string; name?: string; slug?: string; values: string[] }[];
  description?: ApiProductCreateInput['description'];
  excerpt?: ApiProductCreateInput['excerpt'];
}

export class ProductFixture {
  private gql: BaseGqlRequest<unknown, unknown>;

  constructor(gql: BaseGqlRequest<unknown, unknown>) {
    this.gql = gql;
  }

  create = async (variables: { input: ApiProductCreateInput }): Promise<ApiProduct> => {
    const { data } = await this.gql.mutation('inventory-api/ProductCreate', {
      variables,
    });

    const result = (
      data as {
        catalogMutation: {
          productCreate: {
            product: ApiProduct | null;
            userErrors: UserError[];
          };
        };
      }
    ).catalogMutation.productCreate;

    if (result.userErrors.length > 0 || !result.product) {
      throw new Error(`Failed to create product: ${JSON.stringify(result.userErrors)}`);
    }

    return result.product;
  };

  update = async (variables: {
    productId: string;
    expectedRevision?: number;
    operations?: ApiProductUpdateInput;
  }): Promise<ApiProduct> => {
    const { data } = await this.gql.mutation('inventory-api/ProductUpdate', {
      variables,
    });

    const result = (
      data as {
        catalogMutation: {
          productUpdate: {
            product: ApiProduct | null;
            userErrors: UserError[];
          };
        };
      }
    ).catalogMutation.productUpdate;

    if (result.userErrors.length > 0 || !result.product) {
      throw new Error(`Failed to update product: ${JSON.stringify(result.userErrors)}`);
    }

    return result.product;
  };

  findOne = async (id: string): Promise<ApiProduct> => {
    const { data } = await this.gql.query('inventory-api/ProductFindOne', {
      variables: { id },
    });

    const product = (
      data as {
        catalogQuery: {
          product: ApiProduct | null;
        };
      }
    ).catalogQuery.product;

    if (!product) {
      throw new Error(`Product not found: ${id}`);
    }

    return product;
  };

  createWithOptions = async ({
    title,
    handle,
    slug,
    status = 'DRAFT',
    price = 0,
    mediaFileIds,
    options,
    description,
    excerpt,
  }: ProductCreateWithOptionsInput): Promise<ApiProduct> => {
    const productHandle = handle ?? slug ?? slugify(title);
    const normalizedOptions: ApiProductCreateOptionInput[] = options.map((option, optionIndex) => {
      const name = option.name ?? option.title ?? option.slug ?? `Option ${optionIndex + 1}`;
      const optionSlug = option.slug ?? slugify(name);

      return {
        name,
        slug: optionSlug,
        sortIndex: optionIndex,
        values: option.values.map((value, valueIndex) => ({
          name: value,
          slug: slugify(value),
          sortIndex: valueIndex,
        })),
      };
    });

    const combinations = cartesianProduct(
      normalizedOptions.map((option) => option.values.map((value) => value.slug)),
    );

    const product = await this.create({
      input: {
        title,
        handle: productHandle,
        description,
        excerpt,
        mediaFileIds,
        options: normalizedOptions,
        variants: combinations.map((combo) => ({ handle: combo.join('-') })),
      },
    });

    const variants = product.variants.edges.map((edge) => edge.node);
    if (status === 'PUBLISHED' || price > 0) {
      return this.update({
        productId: product.id,
        expectedRevision: product.revision,
        operations: {
          ...(status === 'PUBLISHED' ? { status } : {}),
          ...(price > 0
            ? {
                variants: variants.map((variant) => ({
                  action: 'UPDATE' as const,
                  variantId: variant.id,
                  pricing: {
                    amountMinor: price,
                    currency: 'USD' as const,
                  },
                })),
              }
            : {}),
        },
      });
    }

    return product;
  };
}

function cartesianProduct<T>(matrix: T[][]): T[][] {
  return matrix.reduce<T[][]>((acc, cur) => acc.flatMap((a) => cur.map((b) => [...a, b])), [[]]);
}
