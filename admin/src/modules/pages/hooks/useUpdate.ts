import { useMutation } from '@apollo/client';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { UpdatePageMutation } from '@modules/pages/graphql/update';
import {
  ApiMutation,
  ApiPageMutationUpdateArgs,
  ApiUpdatePageInput,
} from '@src/graphql';

export const useUpdatePage = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiPageMutationUpdateArgs
  >(UpdatePageMutation);

  const updatePage = (input: ApiUpdatePageInput) => {
    return mutation({
      refetchQueries: getRefetchQueries(),
      variables: { input },
    });
  };

  return {
    updatePage,
    loading,
    error,
  };
};
