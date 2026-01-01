import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import {
  AddProductsMutation,
  DeleteProductMutation,
  UpdateCategoryMutation,
  UpdateProductRankMutation,
} from '@modules/categories/graphql/updateCategory';
import {
  ApiAddCategoryProductsInput,
  ApiCategoryMutationUpdateArgs,
  ApiDeleteCategoryProductInput,
  ApiMutation,
  ApiUpdateCategoryInput,
  ApiUpdateCategoryProductInput,
} from '@src/graphql';
import { IMutationHandlers } from '@src/types';
import { useCallback } from 'react';

export const useUpdateCategory = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiCategoryMutationUpdateArgs
  >(UpdateCategoryMutation);

  const updateCategory = useCallback(
    (input: ApiUpdateCategoryInput) => {
      return mutation({
        refetchQueries: getRefetchQueries(),
        variables: { input },
      });
    },
    [mutation],
  );

  return {
    updateCategory,
    loading,
    error,
  };
};

export const useUpdateProductRank = () => {
  const [mutation, { loading, error }] = useMutation(UpdateProductRankMutation);

  const updateProductRank = (
    input: ApiUpdateCategoryProductInput,
    options?: IMutationHandlers,
  ) => {
    return mutation({
      variables: {
        input,
      },
      ...options,
      onCompleted: () => {
        notify.success('Listing reordered.');
      },
      onError: (e) => {
        options?.onError?.(e);
        notify.error('Failed to update listing.');
      },
    });
  };

  return {
    updateProductRank,
    loading,
    error,
  };
};

export const useAddCategoryProducts = () => {
  const [mutation, { loading, error }] = useMutation(AddProductsMutation);

  const addProducts = (
    input: ApiAddCategoryProductsInput,
    options?: IMutationHandlers,
  ) => {
    return mutation({
      variables: {
        input,
      },
      ...options,
      onCompleted: () => {
        notify.success('Products added');
      },
      onError: () => {
        notify.error('Failed to add products');
      },
    });
  };

  return {
    addProducts,
    loading,
    error,
  };
};

export const useDeleteCategoryProducts = () => {
  const [mutation, { loading, error }] = useMutation(DeleteProductMutation);

  const deleteProduct = (
    input: ApiDeleteCategoryProductInput,
    options?: IMutationHandlers,
  ) => {
    return mutation({
      variables: {
        input,
      },
      ...options,
      onCompleted: () => {
        notify.success('Product deleted');
      },
      onError: () => {
        notify.error('Failed to delete product');
      },
    });
  };

  return {
    deleteProduct,
    loading,
    error,
  };
};
