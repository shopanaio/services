import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import {
  ApiFilterMutationUpdateResponse,
  UpdateFilterMutation,
} from '@modules/navigation/graphql/updateFilter';
import {
  ApiFilterMutationUpdateArgs,
  ApiUpdateFilterInput,
} from '@src/graphql';
import { message } from 'antd';

export const useUpdateFilter = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiFilterMutationUpdateResponse,
    ApiFilterMutationUpdateArgs
  >(UpdateFilterMutation);

  const updateFilter = (input: ApiUpdateFilterInput) => {
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
    updateFilter,
    loading,
    error,
  };
};
