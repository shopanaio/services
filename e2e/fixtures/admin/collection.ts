import type { BaseGqlRequest } from '@fixtures/api/gqlRequest';
import type { ApiCollectionCreateInput, ProductSortBy } from '@codegen/admin-gql';
import type { CollectionType } from '@codegen/admin-gql';
import _ from 'lodash';

export interface CollectionData {
  id: string;
  handle: string;
  type: CollectionType;
  name: string;
  defaultSort: ProductSortBy;
  isActive: boolean;
  isPublished: boolean;
}

export class CollectionFixture {
  constructor(private gql: BaseGqlRequest<unknown, unknown>) {}

  create = async (input: Partial<ApiCollectionCreateInput> = {}): Promise<CollectionData> => {
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const defaults: ApiCollectionCreateInput = {
      type: 'MANUAL',
      name: `Test Collection ${uniqueId}`,
      handle: `test-collection-${uniqueId}`,
    };

    const { data } = await this.gql.mutation('catalog-api/CollectionCreate', {
      variables: { input: _.merge(defaults, input) },
    });

    const result = (
      data as {
        catalogMutation: {
          collectionCreate: {
            collection: CollectionData | null;
            userErrors: { code: string; message: string; field: string[] }[];
          };
        };
      }
    ).catalogMutation.collectionCreate;

    if (result.userErrors.length > 0 || !result.collection) {
      throw new Error(`Failed to create collection: ${JSON.stringify(result.userErrors)}`);
    }

    return result.collection;
  };

  createManual = async (
    input: Partial<Omit<ApiCollectionCreateInput, 'type'>> = {},
  ): Promise<CollectionData> => {
    return this.create({ ...input, type: 'MANUAL' });
  };

  createRule = async (
    input: Partial<Omit<ApiCollectionCreateInput, 'type'>> = {},
  ): Promise<CollectionData> => {
    return this.create({ ...input, type: 'RULE' });
  };

  delete = async (id: string): Promise<string | null> => {
    const { data } = await this.gql.mutation('catalog-api/CollectionDelete', {
      variables: { input: { id } },
    });

    const result = (
      data as {
        catalogMutation: {
          collectionDelete: {
            deletedCollectionId: string | null;
            userErrors: { code: string; message: string; field: string[] }[];
          };
        };
      }
    ).catalogMutation.collectionDelete;

    if (result.userErrors.length > 0) {
      throw new Error(`Failed to delete collection: ${JSON.stringify(result.userErrors)}`);
    }

    return result.deletedCollectionId;
  };

  addProducts = async (collectionId: string, productIds: string[]): Promise<CollectionData> => {
    const { data } = await this.gql.mutation('catalog-api/CollectionAddProducts', {
      variables: { input: { collectionId, productIds } },
    });

    const result = (
      data as {
        catalogMutation: {
          collectionAddProducts: {
            collection: CollectionData | null;
            userErrors: { code: string; message: string; field: string[] }[];
          };
        };
      }
    ).catalogMutation.collectionAddProducts;

    if (result.userErrors.length > 0 || !result.collection) {
      throw new Error(`Failed to add products to collection: ${JSON.stringify(result.userErrors)}`);
    }

    return result.collection;
  };

  removeProducts = async (collectionId: string, productIds: string[]): Promise<CollectionData> => {
    const { data } = await this.gql.mutation('catalog-api/CollectionRemoveProducts', {
      variables: { input: { collectionId, productIds } },
    });

    const result = (
      data as {
        catalogMutation: {
          collectionRemoveProducts: {
            collection: CollectionData | null;
            userErrors: { code: string; message: string; field: string[] }[];
          };
        };
      }
    ).catalogMutation.collectionRemoveProducts;

    if (result.userErrors.length > 0 || !result.collection) {
      throw new Error(
        `Failed to remove products from collection: ${JSON.stringify(result.userErrors)}`,
      );
    }

    return result.collection;
  };
}
