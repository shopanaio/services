import { useQuery } from '@apollo/client';
import {
  ApiTagQueryFindManyResponse,
  TagQueryFindMany,
} from '@modules/tags/graphql/findMany';
import { EntryOption } from '@src/entity/EntryOption/EntryOption';
import { ApiTagQueryFindManyArgs } from '@src/graphql';
import { useMemo } from 'react';

export const useTagOptions = ({
  notIn, // search, TODO: search is not used
}: {
  notIn: number[];
}) => {
  const { data, loading, previousData } = useQuery<
    ApiTagQueryFindManyResponse,
    ApiTagQueryFindManyArgs
  >(TagQueryFindMany, {
    fetchPolicy: 'no-cache',
    variables: {
      input: {
        order: 'slugAsc',
        pageSize: 25,
        where: {
          ...(notIn?.length ? { id: { NotIn: notIn } } : {}),
        },
      },
    },
  });

  const options = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.tagQuery?.findMany?.data?.length) {
      return [];
    }

    return currentData.tagQuery.findMany.data
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
