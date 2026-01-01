import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import {
  DeleteManyPagesMutation,
  DeletePageMutation,
} from '@modules/pages/graphql/delete';
import {
  ApiMutation,
  ApiPageMutationDeleteArgs,
  ApiPageMutationDeleteManyArgs,
} from '@src/graphql';

export const usePageDelete = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiPageMutationDeleteArgs
  >(DeletePageMutation);

  const deletePage = async (id: ID) => {
    const { data } = await mutation({
      variables: { id },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Page deleted.'),
      onError: () => notify.error('Could not delete page.'),
    });

    return Boolean(data?.pageMutation?.delete);
  };

  return { deletePage, loading, error };
};

export const usePagesDeleteMany = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiPageMutationDeleteManyArgs
  >(DeleteManyPagesMutation);

  const deleteManyPages = async (ids: ID[]) => {
    const { data } = await mutation({
      variables: { ids },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Pages deleted.'),
      onError: () => notify.error('Could not delete pages.'),
    });

    return data?.pageMutation?.deleteMany;
  };

  return { deleteManyPages, loading, error };
};
