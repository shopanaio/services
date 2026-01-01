import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import {
  ArchiveManyCategoriesMutation,
  DeleteCategoryMutation,
  DeleteManyCategoriesMutation,
} from '@modules/categories/graphql/deleteCategory';
import {
  ApiCategoryMutationArchiveManyArgs,
  ApiCategoryMutationDeleteArgs,
  ApiCategoryMutationDeleteManyArgs,
  ApiMutation,
} from '@src/graphql';

export const useCategoryDelete = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiCategoryMutationDeleteArgs
  >(DeleteCategoryMutation);

  const deleteCategory = async (id: ID) => {
    const { data } = await mutation({
      variables: { id },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Category deleted.'),
      onError: () => notify.error('Could not delete category.'),
    });

    return Boolean(data?.categoryMutation?.delete);
  };

  return { deleteCategory, loading, error };
};

export const useCategoriesDeleteMany = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiCategoryMutationDeleteManyArgs
  >(DeleteManyCategoriesMutation);

  const deleteManyCategories = async (ids: ID[]) => {
    const { data } = await mutation({
      variables: { ids },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Categories deleted.'),
      onError: () => notify.error('Could not delete categories.'),
    });

    return data?.categoryMutation?.deleteMany;
  };

  return { deleteManyCategories, loading, error };
};

export const useCategoriesArchiveMany = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiCategoryMutationArchiveManyArgs
  >(ArchiveManyCategoriesMutation);

  const archiveManyCategories = async (ids: ID[]) => {
    const { data } = await mutation({
      variables: { ids },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Categories archived.'),
      onError: () => notify.error('Could not archive categories.'),
    });

    return (data?.categoryMutation?.archiveMany || []).every(Boolean);
  };

  return { archiveManyCategories, loading, error };
};
