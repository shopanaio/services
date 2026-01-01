import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import {
  ApiFilterMutationUpdateResponse,
  UpdateManyFilterMutation,
} from '@modules/navigation/graphql/updateManyFilters';
import {
  ApiFilterMutationUpdateManyArgs,
  ApiUpdateFilterInput,
} from '@src/graphql';
import { message } from 'antd';

export const useUpdateFilters = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiFilterMutationUpdateResponse,
    ApiFilterMutationUpdateManyArgs
  >(UpdateManyFilterMutation);

  const updateFilters = (input: ApiUpdateFilterInput[]) => {
    return mutation({
      variables: {
        input,
      },
      onError: (error) => {
        console.error(error);
        notify.error('Error updating filter');
      },
    });
  };

  return {
    updateFilters,
    loading,
    error,
  };
};
