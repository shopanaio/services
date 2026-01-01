import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { CreateTagMutation } from '@modules/tags/graphql/create';
import { ApiTagMutationCreateArgs, ApiCreateTagInput, ApiMutation } from '@src/graphql';

export interface IOptions {
  onCompleted?: () => void;
  onError?: () => void;
}

export const useCreateTag = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiTagMutationCreateArgs
  >(CreateTagMutation);

  const createTag = (input: ApiCreateTagInput, options?: IOptions) => {
    return mutation({
      refetchQueries: getRefetchQueries(),
      variables: { input },
      onCompleted: () => {
        options?.onCompleted?.();
      },
      onError: (error) => {
        options?.onError?.();
        console.error(error);
        notify.error('Error creating tag');
      },
    });
  };

  return {
    createTag,
    loading,
    error,
  };
};
