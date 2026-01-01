import { useQuery } from '@apollo/client';
import { mapApiListingFilter } from '@modules/categories/utils/mapApiListingFilters';
import {
  ApiProductQueryFindByListingFiltersResponse,
  ProductQueryByConditions,
} from '@modules/products/graphql/findByConditions';
import {} from '@modules/products/graphql/findMany';
import { IFilter } from '@src/entity/Filter/types';
import { IProductVariant, ProductVariant } from '@src/entity/Product/Variant';
import {
  ApiProductQueryFindByListingFiltersArgs,
  ListingSort,
} from '@src/graphql';

import { useMemo } from 'react';

interface IUseProductsByConditionsProps {
  conditions: IFilter[] | null;
  order: string;
  skip: boolean;
}

export const useProductsByConditions = ({
  conditions,
  order,
  skip,
}: IUseProductsByConditionsProps) => {
  const { data, loading } = useQuery<
    ApiProductQueryFindByListingFiltersResponse,
    ApiProductQueryFindByListingFiltersArgs
  >(ProductQueryByConditions, {
    skip: skip || !conditions,
    fetchPolicy: 'no-cache',
    variables: {
      filters: conditions?.flatMap(mapApiListingFilter) || [],
      order: order || ListingSort.CreatedAtAsc,
    },
  });

  const products = useMemo(() => {
    if (!data?.productQuery?.findByListingFilters?.length) {
      return [];
    }

    return data.productQuery?.findByListingFilters
      .map(ProductVariant.create)
      .filter(Boolean) as IProductVariant[];
  }, [data]);

  return {
    products,
    loading,
  };
};
