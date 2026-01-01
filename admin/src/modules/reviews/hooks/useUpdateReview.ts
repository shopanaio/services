import { useMutation } from '@apollo/client';
import { UpdateReviewMutation } from '@modules/reviews/graphql/updateReview';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import {
  ApiUpdateReviewInput,
  ApiMutation,
  ApiReviewMutationEditArgs,
} from '@src/graphql';
import { IMutationHandlers } from '@src/types';

export const useUpdateReview = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiReviewMutationEditArgs
  >(UpdateReviewMutation);

  const updateReview = (
    input: ApiUpdateReviewInput,
    options?: IMutationHandlers,
  ) => {
    return mutation({
      variables: {
        input,
      },
      refetchQueries: getRefetchQueries(),
      ...options,
    });
  };

  return {
    updateReview,
    loading,
    error,
  };
};
