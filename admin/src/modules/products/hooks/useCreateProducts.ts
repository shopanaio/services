import { useMutation } from '@apollo/client';
import {
  ApiProductMutationCreateResponse,
  CreateProductMutation,
} from '@modules/products/graphql/createProduct';
import {
  ApiProductMutationCreateArgs,
  ApiCreateProductInput,
} from '@src/graphql';
import { IMutationHandlers } from '@src/types';

export const useCreateProducts = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiProductMutationCreateResponse,
    ApiProductMutationCreateArgs
  >(CreateProductMutation);

  const createProducts = (
    input: ApiCreateProductInput,
    options?: IMutationHandlers,
  ) => {
    return mutation({
      variables: {
        input,
      },
      ...options,
      onCompleted: (data) => {
        options?.onCompleted?.(data);
      },
      onError: (error) => {
        options?.onError?.(error);
      },
    });
  };

  return {
    createProducts,
    loading,
    error,
  };
};
