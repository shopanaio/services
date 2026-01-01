import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import {
  ApiFilterMutationCreateResponse,
  CreateFilterMutation,
} from '@modules/navigation/graphql/createFilter';
import {
  ApiFilterMutationCreateArgs,
  ApiCreateFilterInput,
} from '@src/graphql';

export const useCreateFilter = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiFilterMutationCreateResponse,
    ApiFilterMutationCreateArgs
  >(CreateFilterMutation);

  const createFilter = (input: ApiCreateFilterInput) => {
    return mutation({
      variables: {
        input,
      },
      onError: (error) => {
        console.error(error);
        notify.error('Error creating filter');
      },
    });
  };

  return {
    createFilter,
    loading,
    error,
  };
};
