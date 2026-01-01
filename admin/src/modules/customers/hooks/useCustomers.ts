import { useQuery } from '@apollo/client';
import {
  ApiCustomerQueryFindManyResponse,
  CustomerQueryFindMany,
} from '@modules/customers/graphql/findMany';
import { useCustomersTableNavigation } from '@modules/customers/hooks/useTableNavigation';
import { Customer, ICustomer } from '@src/entity/Customer/Customer';
import { ApiCollectionMeta, ApiCustomerQueryFindManyArgs } from '@src/graphql';
import { SortDirection } from '@src/layouts/table/components/Navigation/SortBy';
import { useMemo } from 'react';

export const useCustomers = () => {
  const navigation = useCustomersTableNavigation();

  const variables: ApiCustomerQueryFindManyArgs = {
    input: {
      page: navigation.paginationProps.page,
      pageSize: navigation.paginationProps.pageSize,
      search: (navigation.searchProps.derivedValue || '').toLowerCase(),
      sortField: navigation.sortProps.value.property,
      sortOrder:
        navigation.sortProps.value.direction === SortDirection.ASC
          ? 'ascend'
          : 'descend',
    },
  };

  const { data, loading } = useQuery<ApiCustomerQueryFindManyResponse>(
    CustomerQueryFindMany,
    {
      fetchPolicy: 'no-cache',
      variables,
    },
  );

  const customers = useMemo(() => {
    if (!data?.customerQuery?.findMany?.data?.length) {
      return [];
    }

    return data.customerQuery.findMany.data
      .map(Customer.create)
      .filter(Boolean) as ICustomer[];
  }, [data]);

  const meta: ApiCollectionMeta = useMemo(() => {
    if (!data?.customerQuery?.findMany?.meta) {
      return {
        page: 1,
        pageSize: 25,
        count: 0,
        total: 0,
        pageCount: 0,
      };
    }

    return data.customerQuery.findMany.meta;
  }, [data]);

  return {
    customers,
    loading,
    meta,
    navigation,
  };
};
