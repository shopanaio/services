import { useQuery } from '@apollo/client';
import {
  ApiPageQueryOptionsArgs,
  ApiPageQueryOptionsResponse,
  PageQueryOptions,
} from '@modules/pages/graphql/options';
import { EntryOption } from '@src/entity/EntryOption/EntryOption';
import { useMemo } from 'react';

export const usePageOptions = ({
  notIn,
  search,
}: {
  notIn: number[];
  search: string;
}) => {
  const { data, loading, previousData } = useQuery<
    ApiPageQueryOptionsResponse,
    ApiPageQueryOptionsArgs
  >(PageQueryOptions, {
    fetchPolicy: 'no-cache',
    variables: {
      input: {
        order: 'titleAsc',
        pageSize: 25,
        where: {
          ...(notIn?.length ? { id: { NotIn: notIn } } : {}),
          title: {
            ILike: search,
          },
        },
      },
    },
  });

  const options = useMemo(() => {
    const currentData = loading ? previousData : data;

    if (!currentData?.pageQuery?.findMany?.data?.length) {
      return [];
    }

    return currentData.pageQuery.findMany.data
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
