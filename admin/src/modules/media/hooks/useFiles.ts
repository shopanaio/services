import { useQuery } from '@apollo/client';
import {
  ApiFileQueryFindManyResponse,
  FileQueryFindMany,
} from '@modules/media/graphql/findMany';
import { MediaFile, IMediaFile } from '@src/entity/MediaFile/MediaFile';
import { ApiCollectionMeta, ApiFileQueryFindManyArgs } from '@src/graphql';
import { useMemo } from 'react';
import { useFilesTableNavigation } from '@modules/media/hooks/useTableNavigation';
import { getApiSort } from '@src/layouts/table/components/Navigation/SortBy';
import { getFilesWhereInput } from '@modules/media/utils/getFilesWhereInput';

export const useFiles = () => {
  const navigation = useFilesTableNavigation();

  const input = {
    ...navigation.paginationProps,
    order: getApiSort(navigation.sortProps.value),
    where: {
      ...getFilesWhereInput(navigation),
    },
  };

  const { data, loading, previousData, refetch } = useQuery<
    ApiFileQueryFindManyResponse,
    ApiFileQueryFindManyArgs
  >(FileQueryFindMany, {
    fetchPolicy: 'no-cache',
    variables: {
      input,
    },
  });

  const files = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.fileQuery?.findMany?.data?.length) {
      return [];
    }

    return currentData?.fileQuery.findMany.data
      .map(MediaFile.create)
      .filter(Boolean) as IMediaFile[];
  }, [data, previousData, loading]);

  const meta: ApiCollectionMeta = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.fileQuery?.findMany?.meta) {
      return {
        page: 1,
        pageSize: 25,
        count: 0,
        total: 0,
        pageCount: 0,
      };
    }

    return currentData?.fileQuery.findMany.meta;
  }, [data, previousData, loading]);

  return {
    files,
    loading,
    meta,
    navigation,
    refetch,
  };
};
