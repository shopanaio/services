import { useQuery } from '@apollo/client';
import {
  ApiFilterQueryFindManyResponse,
  FilterQueryFindMany,
} from '@modules/discovery/graphql/filters';
import {
  IProductFilter,
  ProductFilter,
} from '@src/entity/ProductFilter/ProductFilter';
import { ApiFilterQueryFindManyArgs } from '@src/graphql';
import { useMemo } from 'react';

export const useFilters = () => {
  const { data, loading } = useQuery<
    ApiFilterQueryFindManyResponse,
    ApiFilterQueryFindManyArgs
  >(FilterQueryFindMany, {
    fetchPolicy: 'no-cache',
    variables: {
      input: {
        order: 'sortIndexAsc',
      },
    },
  });

  const filters = useMemo(() => {
    return (data?.filterQuery.findMany || [])
      .map(ProductFilter.create)
      .filter(Boolean) as IProductFilter[];
  }, [data]);

  return {
    filters,
    loading,
  };
};
