import { useMutation } from '@apollo/client';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { CreateReviewMutation } from '@modules/reviews/graphql/createReview';
import {
  ApiCreateReviewInput,
  ApiMutation,
  ApiReviewMutationCreateArgs,
} from '@src/graphql';
import { IMutationHandlers } from '@src/types';

export const useCreateReview = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiReviewMutationCreateArgs
  >(CreateReviewMutation);

  const createReview = (
    input: ApiCreateReviewInput,
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
    createReview,
    loading,
    error,
  };
};
