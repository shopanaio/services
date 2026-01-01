import { useQuery } from '@apollo/client';
import {
  ApiCustomerQueryOptionsArgs,
  ApiCustomerQueryOptionsResponse,
  CustomerQueryOptions,
} from '@modules/customers/graphql/options';
import { useCustomersTableNavigation } from '@modules/customers/hooks/useTableNavigation';
import { ApiCollectionMeta, ApiCustomerQueryFindManyArgs } from '@src/graphql';
import { SortDirection } from '@src/layouts/table/components/Navigation/SortBy';
import { useEffect, useMemo } from 'react';
import { Customer, ICustomer } from '@src/entity/Customer/Customer';

export const useBrowseCustomers = ({
  isActive,
  selectedRows,
  multiple,
}: {
  notIn?: number[];
  isActive?: boolean;
  selectedRows?: ICustomer[];
  multiple?: boolean;
} = {}) => {
  const navigation = useCustomersTableNavigation({
    keepSelectedRows: true,
    selectedRowsMode: multiple ? 'multiple' : 'single',
  });

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

  const { data, loading, previousData } = useQuery<
    ApiCustomerQueryOptionsResponse,
    ApiCustomerQueryOptionsArgs
  >(CustomerQueryOptions, {
    skip: !isActive,
    fetchPolicy: 'no-cache',
    variables,
  });

  const {
    selectedRowsProps: { onChangeSelectedRows },
  } = navigation;

  useEffect(() => {
    if (isActive && selectedRows) {
      onChangeSelectedRows(selectedRows);
    }
  }, [isActive, onChangeSelectedRows, selectedRows]);

  const options = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.customerQuery?.findMany?.data?.length) {
      return [];
    }

    return currentData.customerQuery.findMany.data
      .map(Customer.create)
      .filter(Boolean) as ICustomer[];
  }, [data, previousData, loading]);

  const meta: ApiCollectionMeta = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.customerQuery?.findMany?.meta) {
      return {
        page: 1,
        pageSize: 25,
        count: 0,
        total: 0,
        pageCount: 0,
      };
    }

    return currentData.customerQuery.findMany.meta;
  }, [data, previousData, loading]);

  return {
    options,
    loading,
    meta,
    navigation,
  };
};
