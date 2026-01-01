import { useQuery } from '@apollo/client';
import {
  ApiReviewQueryFindManyResponse,
  ReviewQueryFindMany,
} from '@modules/reviews/graphql/findMany';
import { Review, IReview } from '@src/entity/Review/Review';
import { ApiCollectionMeta, ApiReviewQueryFindManyArgs } from '@src/graphql';
import { useMemo } from 'react';
import { useReviewsTableNavigation } from '@modules/reviews/hooks/useTableNavigation';

export const useReviews = () => {
  const navigation = useReviewsTableNavigation();

  const { data, loading, previousData, refetch } = useQuery<
    ApiReviewQueryFindManyResponse,
    ApiReviewQueryFindManyArgs
  >(ReviewQueryFindMany, {
    fetchPolicy: 'no-cache',
    variables: {
      input: {
        pageSize: navigation.paginationProps.pageSize,
        page: navigation.paginationProps.page,
      },
    },
  });

  const reviews = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.reviewQuery?.findMany?.data?.length) {
      return [];
    }

    return currentData?.reviewQuery.findMany.data
      .map(Review.create)
      .filter(Boolean) as IReview[];
  }, [data, previousData, loading]);

  const meta: ApiCollectionMeta = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.reviewQuery?.findMany?.meta) {
      return {
        page: 1,
        pageSize: 25,
        count: 0,
        total: 0,
        pageCount: 0,
      };
    }

    return currentData?.reviewQuery.findMany.meta;
  }, [data, previousData, loading]);

  return {
    reviews,
    loading,
    meta,
    navigation,
    refetch,
  };
};
