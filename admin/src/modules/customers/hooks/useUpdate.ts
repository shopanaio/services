import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import {
  ApiCustomerMutationUpdateResponse,
  UpdateCustomerMutation,
} from '@modules/customers/graphql/update';
import {
  ApiCustomerMutationUpdateArgs,
  ApiUpdateCustomerInput,
} from '@src/graphql';

export const useUpdateCustomer = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiCustomerMutationUpdateResponse,
    ApiCustomerMutationUpdateArgs
  >(UpdateCustomerMutation);

  const updateCustomer = (input: ApiUpdateCustomerInput) => {
    return mutation({
      refetchQueries: getRefetchQueries(),
      variables: { input },
    });
  };

  return {
    updateCustomer,
    loading,
    error,
  };
};
