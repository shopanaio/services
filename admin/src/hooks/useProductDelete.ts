import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import {
  ArchiveManyProductsMutation,
  ArchiveProductMutation,
  DeleteManyProductsMutation,
  DeleteProductMutation,
} from '@modules/products/graphql/deleteProduct';
import {
  ApiMutation,
  ApiProductMutationArchiveArgs,
  ApiProductMutationArchiveManyArgs,
  ApiProductMutationDeleteArgs,
  ApiProductMutationDeleteManyArgs,
} from '@src/graphql';

export const useProductDelete = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiProductMutationDeleteArgs
  >(DeleteProductMutation);

  const deleteProduct = async (id: ID) => {
    const { data } = await mutation({
      variables: { id },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Product deleted.'),
      onError: () => notify.error('Could not delete product.'),
    });

    return Boolean(data?.productMutation?.delete);
  };

  return { deleteProduct, loading, error };
};

export const useProductArchive = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiProductMutationArchiveArgs
  >(ArchiveProductMutation);

  const archiveProduct = async (id: ID) => {
    const { data } = await mutation({
      variables: { id },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Product archived.'),
      onError: () => notify.error('Could not archive product.'),
    });

    return Boolean(data?.productMutation?.archive);
  };

  return { archiveProduct, loading, error };
};

export const useProductsDeleteMany = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiProductMutationDeleteManyArgs
  >(DeleteManyProductsMutation);

  const deleteManyProducts = async (ids: ID[]) => {
    const { data } = await mutation({
      variables: { ids },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Products deleted.'),
      onError: () => notify.error('Could not delete products.'),
    });

    return data?.productMutation?.deleteMany;
  };

  return { deleteManyProducts, loading, error };
};

export const useProductsArchiveMany = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiProductMutationArchiveManyArgs
  >(ArchiveManyProductsMutation);

  const archiveManyProducts = async (ids: ID[]) => {
    const { data } = await mutation({
      variables: { ids },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Products archived.'),
      onError: () => notify.error('Could not archive products.'),
    });

    return (data?.productMutation?.archiveMany || []).every(Boolean);
  };

  return { archiveManyProducts, loading, error };
};
