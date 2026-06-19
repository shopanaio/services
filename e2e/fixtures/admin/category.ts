import type { BaseGqlRequest } from '@fixtures/api/gqlRequest';
import type {
  ApiCategoryCreateInput,
  ApiCategoryUpdateInput,
  ProductSortBy,
  SortDirection,
} from '@codegen/admin-gql';
import _ from 'lodash';

export interface CategoryData {
  id: string;
  handle: string;
  name: string;
  defaultSort: string;
  defaultSortDirection: string;
  isPublished: boolean;
  publishedAt: string | null;
  productsCount: number;
  seo?: {
    seoTitle: string | null;
    seoDescription: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: { id: string } | null;
  } | null;
}

export class CategoryFixture {
  constructor(private gql: BaseGqlRequest<unknown, unknown>) {}

  create = async (input: Partial<ApiCategoryCreateInput> = {}): Promise<CategoryData> => {
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const defaults: ApiCategoryCreateInput = {
      handle: `test-category-${uniqueId}`,
      name: `Test Category ${uniqueId}`,
    };

    const { data } = await this.gql.mutation('category-api/CategoryCreate', {
      variables: { input: _.merge(defaults, input) },
    });

    const result = (
      data as {
        catalogMutation: {
          categoryCreate: {
            category: CategoryData | null;
            userErrors: { code: string; message: string; field: string[] }[];
          };
        };
      }
    ).catalogMutation.categoryCreate;

    if (result.userErrors.length > 0 || !result.category) {
      throw new Error(`Failed to create category: ${JSON.stringify(result.userErrors)}`);
    }

    return result.category;
  };

  update = async (id: string, input: Partial<ApiCategoryUpdateInput>): Promise<CategoryData> => {
    const { data } = await this.gql.mutation('category-api/CategoryUpdate', {
      variables: { input: { id, ...input } },
    });

    const result = (
      data as {
        catalogMutation: {
          categoryUpdate: {
            category: CategoryData | null;
            userErrors: { code: string; message: string; field: string[] }[];
          };
        };
      }
    ).catalogMutation.categoryUpdate;

    if (result.userErrors.length > 0 || !result.category) {
      throw new Error(`Failed to update category: ${JSON.stringify(result.userErrors)}`);
    }

    return result.category;
  };

  updateSort = async (
    id: string,
    defaultSort: ProductSortBy,
    defaultSortDirection: SortDirection
  ): Promise<CategoryData> => {
    const { data } = await this.gql.mutation('category-api/CategoryUpdateSort', {
      variables: { input: { id, defaultSort, defaultSortDirection } },
    });

    const result = (
      data as {
        catalogMutation: {
          categoryUpdateSort: {
            category: CategoryData | null;
            userErrors: { code: string; message: string; field: string[] }[];
          };
        };
      }
    ).catalogMutation.categoryUpdateSort;

    if (result.userErrors.length > 0 || !result.category) {
      throw new Error(`Failed to update category sort: ${JSON.stringify(result.userErrors)}`);
    }

    return result.category;
  };

  moveProduct = async (
    categoryId: string,
    productId: string,
    options: { afterProductId?: string; beforeProductId?: string } = {}
  ): Promise<CategoryData> => {
    const { data } = await this.gql.mutation('category-api/CategoryMoveProduct', {
      variables: {
        input: {
          categoryId,
          productId,
          afterProductId: options.afterProductId,
          beforeProductId: options.beforeProductId,
        },
      },
    });

    const result = (
      data as {
        catalogMutation: {
          categoryMoveProduct: {
            category: CategoryData | null;
            userErrors: { code: string; message: string; field: string[] }[];
          };
        };
      }
    ).catalogMutation.categoryMoveProduct;

    if (result.userErrors.length > 0 || !result.category) {
      throw new Error(`Failed to move product: ${JSON.stringify(result.userErrors)}`);
    }

    return result.category;
  };

  rebalance = async (categoryId: string): Promise<CategoryData> => {
    const { data } = await this.gql.mutation('category-api/CategoryRebalance', {
      variables: { input: { categoryId } },
    });

    const result = (
      data as {
        catalogMutation: {
          categoryRebalance: {
            category: CategoryData | null;
            userErrors: { code: string; message: string; field: string[] }[];
          };
        };
      }
    ).catalogMutation.categoryRebalance;

    if (result.userErrors.length > 0 || !result.category) {
      throw new Error(`Failed to rebalance category: ${JSON.stringify(result.userErrors)}`);
    }

    return result.category;
  };

  delete = async (id: string, permanent: boolean = false): Promise<string> => {
    const { data } = await this.gql.mutation('category-api/CategoryDelete', {
      variables: { input: { id, permanent } },
    });

    const result = (
      data as {
        catalogMutation: {
          categoryDelete: {
            deletedCategoryId: string | null;
            userErrors: { code: string; message: string; field: string[] }[];
          };
        };
      }
    ).catalogMutation.categoryDelete;

    if (result.userErrors.length > 0 || !result.deletedCategoryId) {
      throw new Error(`Failed to delete category: ${JSON.stringify(result.userErrors)}`);
    }

    return result.deletedCategoryId;
  };

  findOne = async (id: string): Promise<CategoryData | null> => {
    const { data } = await this.gql.query('category-api/CategoryFindOne', {
      variables: { id },
    });

    return (
      data as {
        catalogQuery: {
          category: CategoryData | null;
        };
      }
    ).catalogQuery.category;
  };
}
