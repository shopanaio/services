import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import {
  ArchiveCustomerMutation,
  ArchiveManyCustomersMutation,
  DeleteCustomerMutation,
  DeleteManyCustomersMutation,
} from '@modules/customers/graphql/deleteCustomer';
import {
  ApiCustomerMutationArchiveArgs,
  ApiCustomerMutationArchiveManyArgs,
  ApiCustomerMutationDeleteArgs,
  ApiCustomerMutationDeleteManyArgs,
  ApiMutation,
} from '@src/graphql';

export const useCustomerDelete = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiCustomerMutationDeleteArgs
  >(DeleteCustomerMutation);

  const deleteCustomer = async (id: ID) => {
    const { data } = await mutation({
      variables: { id },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Customer deleted.'),
      onError: () => notify.error('Could not delete customer.'),
    });

    return Boolean(data?.customerMutation?.delete);
  };

  return { deleteCustomer, loading, error };
};

export const useCustomerArchive = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiCustomerMutationArchiveArgs
  >(ArchiveCustomerMutation);

  const archiveCustomer = async (id: ID) => {
    const { data } = await mutation({
      variables: { id },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Customer archived.'),
      onError: () => notify.error('Could not archive customer.'),
    });

    return Boolean(data?.customerMutation?.archive);
  };

  return { archiveCustomer, loading, error };
};

export const useCustomersDeleteMany = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiCustomerMutationDeleteManyArgs
  >(DeleteManyCustomersMutation);

  const deleteManyCustomers = async (ids: ID[]) => {
    const { data } = await mutation({
      variables: { ids },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Customers deleted.'),
      onError: () => notify.error('Could not delete customers.'),
    });

    return data?.customerMutation?.deleteMany;
  };

  return { deleteManyCustomers, loading, error };
};

export const useCustomersArchiveMany = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiCustomerMutationArchiveManyArgs
  >(ArchiveManyCustomersMutation);

  const archiveManyCustomers = async (ids: ID[]) => {
    const { data } = await mutation({
      variables: { ids },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Customers archived.'),
      onError: () => notify.error('Could not archive customers.'),
    });

    return (data?.customerMutation?.archiveMany || []).every(Boolean);
  };

  return { archiveManyCustomers, loading, error };
};
