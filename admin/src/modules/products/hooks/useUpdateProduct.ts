import { useMutation } from '@apollo/client';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import {
  ApiProductMutationUpdateResponse,
  UpdateProductMutation,
} from '@modules/products/graphql/updateProduct';

import {
  ApiProductMutationUpdateArgs,
  ApiUpdateProductInput,
} from '@src/graphql';

export const useUpdateProduct = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiProductMutationUpdateResponse,
    ApiProductMutationUpdateArgs
  >(UpdateProductMutation);

  const updateProduct = (input: ApiUpdateProductInput) => {
    return mutation({
      refetchQueries: getRefetchQueries(),
      variables: {
        input,
      },
    });
  };

  return {
    updateProduct,
    loading,
    error,
  };
};
