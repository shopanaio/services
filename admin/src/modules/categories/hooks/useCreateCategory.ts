import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import {
  CreateCategoriesMutation,
  CreateCategoryMutation,
} from '@modules/categories/graphql/createCategory';
import { getCreateCategoryPayload } from '@modules/categories/utils/getCreateCategoryPayload';
import {
  ApiCategoryMutationCreateArgs,
  ApiCategoryMutationCreateManyArgs,
  ApiCreateCategoryInput,
  ApiMutation,
  EntityStatus,
  ListingSort,
} from '@src/graphql';
import { IMutationHandlers } from '@src/types';

export const useCreateCategory = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiCategoryMutationCreateArgs
  >(CreateCategoryMutation);

  const createCategory = async () => {
    const { data } = await mutation({
      refetchQueries: getRefetchQueries(),
      variables: {
        input: getCreateCategoryPayload({
          data: {
            entryType: null,
            children: [],
            conditions: [],
            conditionsType: '',
            title: 'Untitled',
            description: null,
            excerpt: null,
            cover: null,
            listingOrderBy: ListingSort.CreatedAtAsc,
            parents: [],
            slug: crypto.randomUUID(),
            status: EntityStatus.Draft,
            listingOrderByStatus: true,
            gallery: [],
            includeChildrenProducts: false,
          },
        }),
      },
      onCompleted: () => {
        notify.success('Category created.');
      },
      onError: () => {
        notify.error(`Couldn't create category.`);
      },
    });

    return data?.categoryMutation?.create || null;
  };

  return {
    createCategory,
    loading,
    error,
  };
};

export const useCreateCategories = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiCategoryMutationCreateManyResponse,
    ApiCategoryMutationCreateManyArgs
  >(CreateCategoriesMutation);

  const createCategories = (
    input: ApiCreateCategoryInput[],
    options?: IMutationHandlers,
  ) => {
    return mutation({
      variables: {
        input,
      },
      ...options,
    });
  };

  return {
    createCategories,
    loading,
    error,
  };
};
