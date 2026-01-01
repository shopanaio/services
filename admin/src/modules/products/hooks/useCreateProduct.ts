import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import {
  ApiProductMutationCreateResponse,
  CreateProductMutation,
} from '@modules/products/graphql/createProduct';
import { getCreateProductPayload } from '@modules/products/utils/getCreateProductPayload';
import { StockStatuses } from '@src/defs/constants';

import {
  ApiProductMutationCreateArgs,
  EntityStatus,
  WeightUnit,
} from '@src/graphql';

export const useCreateProduct = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiProductMutationCreateResponse,
    ApiProductMutationCreateArgs
  >(CreateProductMutation);

  const createProduct = async (): Promise<ID | null> => {
    const { data } = await mutation({
      refetchQueries: getRefetchQueries(),
      variables: {
        input: getCreateProductPayload({
          data: {
            costPrice: 0,
            attributes: [],
            categories: [],
            cover: null,
            description: null,
            excerpt: '',
            gallery: [],
            oldPrice: 0,
            options: [],
            price: 0,
            requiresShipping: false,
            sku: '',
            slug: crypto.randomUUID(),
            status: EntityStatus.Draft,
            stockStatus: StockStatuses.OUT_OF_STOCK,
            tags: [],
            title: 'Untitled',
            weight: 0,
            weightUnit: WeightUnit.Gr,
            variants: [],
            groups: [],
          },
        }),
      },
      onCompleted: () => {
        notify.success('Product created.');
      },
      onError: () => {
        notify.error('Could not create product.');
      },
    });

    return data?.productMutation?.create?.id || null;
  };

  return {
    createProduct,
    loading,
    error,
  };
};
