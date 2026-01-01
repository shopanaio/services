import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { DeleteReviewMutation } from '@modules/reviews/graphql/deleteReview';
import { ApiMutation, ApiReviewMutationDeleteArgs } from '@src/graphql';

export const useReviewDelete = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiReviewMutationDeleteArgs
  >(DeleteReviewMutation);

  const deleteReview = async (id: ID) => {
    const { data } = await mutation({
      variables: { input: id },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Review deleted.'),
      onError: () => notify.error('Could not delete review.'),
    });

    return Boolean(data?.reviewMutation?.delete);
  };

  return { deleteReview, loading, error };
};
