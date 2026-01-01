import { useQuery } from '@apollo/client';
import {
  ApiCustomerQueryOptionsArgs,
  ApiCustomerQueryOptionsResponse,
  CustomerQueryOptions,
} from '@modules/customers/graphql/options';
import { EntryOption } from '@src/entity/EntryOption/EntryOption';
import { useMemo } from 'react';

// TODO
export const useCustomerOptions = ({
  notIn,
}: {
  notIn: number[];
  search: string;
}) => {
  const { data, loading, previousData } = useQuery<
    ApiCustomerQueryOptionsResponse,
    ApiCustomerQueryOptionsArgs
  >(CustomerQueryOptions, {
    fetchPolicy: 'no-cache',
    variables: {
      input: {
        order: 'titleAsc',
        pageSize: 25,
        where: {
          ...(notIn?.length ? { id: { NotIn: notIn } } : {}),
        },
      },
    },
  });

  const options = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.customerQuery?.findMany?.data?.length) {
      return [];
    }

    return currentData.customerQuery.findMany.data
      .map(EntryOption.create)
      .filter(Boolean)
      .map((it) => ({
        value: it?.id,
        label: it?.title,
        data: it,
      }));
  }, [data, previousData, loading]);

  return {
    options,
    loading,
  };
};
