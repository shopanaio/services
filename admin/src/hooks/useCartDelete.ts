import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { DeleteCartMutation } from '@modules/carts/graphql/deleteCart';
import { ApiMutation, ApiCartMutationDeleteArgs } from '@src/graphql';

export const useCartDelete = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiCartMutationDeleteArgs
  >(DeleteCartMutation);

  const deleteCart = async (id: ID) => {
    const { data } = await mutation({
      variables: { id },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Cart deleted.'),
      onError: () => notify.error('Could not delete cart.'),
    });

    return Boolean(data?.cartMutation?.delete);
  };

  return { deleteCart, loading, error };
};
