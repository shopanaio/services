import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import {
  ApiCustomerMutationCreateResponse,
  CreateCustomerMutation,
} from '@modules/customers/graphql/create';
import { getCreateCustomerPayload } from '@modules/customers/utils/getCreatePayload';
import {
  ApiCustomerMutationCreateArgs,
  ApiCreateCustomerInput,
} from '@src/graphql';
import { useEntityDrawer } from '@src/layouts/drawers/hooks/useEntityDrawer';
import { syntheticId } from '@src/utils/synthetic-id';

export const useCreateCustomer = () => {
  const { forceClose } = useEntityDrawer();
  const [mutation, { loading, error }] = useMutation<
    ApiCustomerMutationCreateResponse,
    ApiCustomerMutationCreateArgs
  >(CreateCustomerMutation);

  const createCustomer = (input: ApiCreateCustomerInput) => {
    return mutation({
      refetchQueries: getRefetchQueries(),
      variables: {
        input,
      },
      onCompleted: () => {
        forceClose?.();
      },
      onError: (error) => {
        console.error(error);
        notify.error('Error creating customer');
      },
    });
  };

  return {
    createCustomer,
    loading,
    error,
  };
};

export const useCreateEmptyCustomer = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiCustomerMutationCreateResponse,
    ApiCustomerMutationCreateArgs
  >(CreateCustomerMutation);

  const createCustomer = async () => {
    const { data } = await mutation({
      refetchQueries: getRefetchQueries(),
      variables: {
        input: getCreateCustomerPayload({
          data: {
            firstName: 'First',
            lastName: 'Last',
            email: syntheticId() + '@example.com',
            password: '123456',
            language: 'en',
            isEmailVerified: false,
            phone: '',
          },
        }),
      },
      onCompleted: () => {
        notify.success('Customer created');
      },
      onError: () => {
        notify.error('Failed to create customer');
      },
    });

    return data?.customerMutation?.create ?? null;
  };

  return {
    createCustomer,
    loading,
    error,
  };
};
