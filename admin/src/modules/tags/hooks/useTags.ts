import { useQuery } from '@apollo/client';
import {
  ApiTagQueryFindManyResponse,
  TagQueryFindMany,
} from '@modules/tags/graphql/findMany';
import { useTagsTableNavigation } from '@modules/tags/hooks/useTableNavigation';
import { getTagsWhereInput } from '@modules/tags/utils/getWhereInput';
import { Tag, ITag } from '@src/entity/Tag/Tag';
import { ApiCollectionMeta, ApiTagQueryFindManyArgs } from '@src/graphql';
import { getApiSort } from '@src/layouts/table/components/Navigation/SortBy';
import { useMemo } from 'react';

export const useTags = () => {
  const navigation = useTagsTableNavigation();
  const variables = {
    input: {
      order: getApiSort(navigation.sortProps.value),
      ...navigation.paginationProps,
      where: getTagsWhereInput(navigation),
    },
  } as ApiTagQueryFindManyArgs;

  const { data, loading, previousData } = useQuery<ApiTagQueryFindManyResponse>(
    TagQueryFindMany,
    {
      fetchPolicy: 'no-cache',
      variables,
    },
  );

  const tags = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.tagQuery?.findMany?.data?.length) {
      return [];
    }

    return currentData.tagQuery.findMany.data
      .map(Tag.create)
      .filter(Boolean) as ITag[];
  }, [data, previousData, loading]);

  const meta: ApiCollectionMeta = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.tagQuery?.findMany?.meta) {
      return {
        page: 1,
        pageSize: 25,
        count: 0,
        total: 0,
        pageCount: 0,
      };
    }

    return currentData.tagQuery.findMany.meta;
  }, [data, previousData, loading]);

  return {
    tags,
    loading,
    meta,
    navigation,
  };
};
