import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { UpdateTagMutation } from '@modules/tags/graphql/update';
import { ApiMutation, ApiUpdateTagInput } from '@src/graphql';

export interface IOptions {
  onCompleted?: () => void;
  onError?: () => void;
}

export const useUpdateTag = () => {
  const [mutation, { loading, error }] =
    useMutation<ApiMutation>(UpdateTagMutation);

  const updateTag = (input: ApiUpdateTagInput, options?: IOptions) => {
    return mutation({
      refetchQueries: getRefetchQueries(),
      variables: {
        input,
      },
      onCompleted: () => {
        options?.onCompleted?.();
      },
      onError: (error) => {
        notify.error('Error updating tag');
      },
    });
  };

  return {
    updateTag,
    loading,
    error,
  };
};
