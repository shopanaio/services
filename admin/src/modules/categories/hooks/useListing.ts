import { useQuery } from '@apollo/client';
import {
  ListingQuery,
  ApiListingQueryResponse,
} from '@modules/categories/graphql/listing';
import { getApiListingFilters } from '@modules/categories/utils/mapApiListingFilters';
import { IFilter } from '@src/entity/Filter/types';
import { IProductVariant, ListingProduct } from '@src/entity/Product/Variant';
import { ApiListingQueryListingV1Args, ListingSort } from '@src/graphql';
import { useMemo } from 'react';

const PAGE_SIZE = 5;

interface IUseProductsByConditionsProps {
  slug: string;
  conditions: IFilter[] | null;
  skip: boolean;
  order: ListingSort;
  perPage?: number;
}

export const useListing = ({
  slug,
  conditions,
  skip,
  perPage,
}: IUseProductsByConditionsProps) => {
  const { data, loading, fetchMore, refetch } = useQuery<
    ApiListingQueryResponse,
    ApiListingQueryListingV1Args
  >(ListingQuery, {
    skip: skip || !slug,
    fetchPolicy: 'no-cache',
    variables: {
      input: {
        page: 1,
        perPage,
        filters: getApiListingFilters(conditions || []),
        category: { slug },
        sort: ListingSort.Custom,
      },
    },
  });

  const listing = useMemo(() => {
    if (!data?.listingQuery?.listingV1?.data?.length) {
      return [];
    }
    return data.listingQuery.listingV1.data
      .map((it) => ListingProduct.create(it))
      .filter(Boolean) as IProductVariant[];
  }, [data]);

  const meta = useMemo(() => {
    if (!data?.listingQuery?.listingV1?.meta) {
      return {
        page: 1,
        pageSize: PAGE_SIZE,
        count: 0,
        total: 0,
        pageCount: 0,
      };
    }
    return data.listingQuery.listingV1.meta;
  }, [data]);

  // Function to load a new page of results and merge with current ones.
  const loadMore = (newPage: number) => {
    return fetchMore({
      variables: {
        input: {
          page: newPage,
          perPage,
          filters: getApiListingFilters(conditions || []),
          category: { slug },
          sort: ListingSort.Custom,
        },
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) {
          return prev;
        }

        return {
          ...fetchMoreResult,
          listingQuery: {
            ...fetchMoreResult.listingQuery,
            listingV1: {
              ...fetchMoreResult.listingQuery.listingV1,
              data: [
                ...prev.listingQuery.listingV1.data,
                ...fetchMoreResult.listingQuery.listingV1.data,
              ],
            },
          },
        };
      },
    });
  };

  return {
    listing,
    loading,
    refetch,
    loadMore,
    meta,
  };
};
