import { useQuery } from '@apollo/client';
import { ApiCollectionMeta, ApiFileQueryFindManyArgs } from '@src/graphql';
import { getApiSort } from '@src/layouts/table/components/Navigation/SortBy';
import { useEffect, useMemo } from 'react';
import { useFilesTableNavigation } from '@modules/media/hooks/useTableNavigation';
import {
  ApiFileQueryFindManyResponse,
  FileQueryFindMany,
} from '@modules/media/graphql/findMany';
import { getFilesWhereInput } from '@modules/media/utils/getFilesWhereInput';
import { IMediaFile, MediaFile } from '@src/entity/MediaFile/MediaFile';

export const useBrowseFiles = ({
  isActive,
  selectedRows,
  multiple = true,
}: {
  isActive?: boolean;
  multiple?: boolean;
  selectedRows: IMediaFile[];
}) => {
  const navigation = useFilesTableNavigation({
    selectedRowsMode: multiple ? 'multiple' : 'single',
    keepSelectedRows: true,
  });

  const input = {
    ...navigation.paginationProps,
    order: getApiSort(navigation.sortProps.value),
    where: {
      ...getFilesWhereInput(navigation),
    },
  };

  const { setSelectedRows } = navigation.selectedRowsProps;

  useEffect(() => {
    if (isActive) {
      setSelectedRows(selectedRows);
    }
  }, [isActive, setSelectedRows, selectedRows]);

  const { data, loading, previousData } = useQuery<
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
  };
};
