import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { CreatePageMutation } from '@modules/pages/graphql/create';
import { getCreatePagePayload } from '@modules/pages/utils/getCreatePayload';
import {
  ApiMutation,
  ApiPageMutationCreateArgs,
  EntityStatus,
} from '@src/graphql';

export const useCreatePage = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiPageMutationCreateArgs
  >(CreatePageMutation);

  const createPage = async () => {
    const { data } = await mutation({
      refetchQueries: getRefetchQueries(),
      variables: {
        input: getCreatePagePayload({
          data: {
            gallery: [],
            entryType: null,
            title: 'Untitled',
            description: null,
            excerpt: null,
            cover: null,
            slug: crypto.randomUUID(),
            status: EntityStatus.Draft,
          },
        }),
      },
      onCompleted: () => {
        notify.success('Page created.');
      },
      onError: () => {
        notify.error('Failed to create page.');
      },
    });

    if (!data?.pageMutation?.create) {
      throw new Error('Failed to create page.');
    }

    return data.pageMutation.create;
  };

  return {
    createPage,
    loading,
    error,
  };
};
