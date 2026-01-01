import { useQuery } from '@apollo/client';
import {
  ApiTagQueryFindManyResponse,
  TagQueryFindMany,
} from '@modules/tags/graphql/findMany';
import { useTagsTableNavigation } from '@modules/tags/hooks/useTableNavigation';
import { getTagsWhereInput } from '@modules/tags/utils/getWhereInput';
import { ITag, Tag } from '@src/entity/Tag/Tag';
import { sanitizeEntries } from '@src/entity/utils';
import { ApiCollectionMeta, ApiTagQueryFindManyArgs } from '@src/graphql';
import { getApiSort } from '@src/layouts/table/components/Navigation/SortBy';
import { useEffect, useMemo } from 'react';

export const useBrowseTags = ({
  isActive,
  multiple = true,
  value,
}: {
  isActive?: boolean;
  multiple?: boolean;
  value: ITag[];
}) => {
  const navigation = useTagsTableNavigation({
    selectedRowsMode: multiple ? 'multiple' : 'single',
    keepSelectedRows: true,
  });

  const input = {
    order: getApiSort(navigation.sortProps.value),
    ...navigation.paginationProps,
    where: getTagsWhereInput(navigation),
  };

  const { setSelectedRows } = navigation.selectedRowsProps;
  useEffect(() => {
    if (!isActive) {
      return;
    }

    setSelectedRows(value);
  }, [value, setSelectedRows, isActive]);

  const { data, loading, previousData } = useQuery<
    ApiTagQueryFindManyResponse,
    ApiTagQueryFindManyArgs
  >(TagQueryFindMany, {
    skip: !isActive,
    fetchPolicy: 'no-cache',
    variables: { input },
  });

  const options = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.tagQuery?.findMany?.data?.length) {
      return [];
    }

    return sanitizeEntries(currentData.tagQuery.findMany.data.map(Tag.create));
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
    options,
    loading,
    meta,
    navigation,
  };
};
