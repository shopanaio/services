import { useMutation, useQuery } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { MenuQueries } from '@modules/menus/graphql/menu';
import {
  ApiMenuMutationCreateArgs,
  ApiMutation,
  ApiUpdateMenuInput,
  EntityStatus,
  ApiCollectionMeta,
  ApiQuery,
} from '@src/graphql';

import { useMenusTableNavigation } from '@modules/menus/hooks/useTableNavigation';
import { getMenusWhereInput } from '@modules/menus/utils/getWhereInput';
import { IMenu, Menu } from '@src/entity/Menu/Menu';
import { getApiSort } from '@src/layouts/table/components/Navigation/SortBy';
import { useMemo } from 'react';

export const useMenus = () => {
  const navigation = useMenusTableNavigation();

  const input = {
    order: getApiSort(navigation.sortProps.value),
    ...navigation.paginationProps,
    where: getMenusWhereInput(navigation),
  };

  const { data, loading } = useQuery<ApiQuery>(MenuQueries.MenuFindMany, {
    fetchPolicy: 'no-cache',
    variables: { input },
  });

  const menus = useMemo(() => {
    if (!data?.menuQuery?.findMany?.data?.length) {
      return [];
    }

    return data.menuQuery.findMany.data
      .map(Menu.create)
      .filter(Boolean) as IMenu[];
  }, [data]);

  const meta: ApiCollectionMeta = useMemo(() => {
    if (!data?.menuQuery?.findMany?.meta) {
      return {
        page: 1,
        pageSize: 25,
        count: 0,
        total: 0,
        pageCount: 0,
      };
    }

    return data.menuQuery.findMany.meta;
  }, [data]);

  return {
    options: menus,
    loading,
    meta,
    navigation,
  };
};

export const useCreateMenu = () => {
  const [mutation] = useMutation<ApiMutation, ApiMenuMutationCreateArgs>(
    MenuQueries.CreateMenuMutation,
  );

  const createMenu = async () => {
    try {
      const { data } = await mutation({
        variables: {
          input: {
            items: [],
            slug: crypto.randomUUID(),
            title: 'Untitled',
            status: EntityStatus.Draft,
          },
        },
        refetchQueries: getRefetchQueries(),
      });
      if (!data?.menuMutation.create) {
        throw new Error('Failed to create menu');
      }
      notify.success('Menu created successfully');
      return data.menuMutation.create;
    } catch {
      notify.error('Failed to create menu');
      return null;
    }
  };

  return {
    createMenu,
  };
};

export const useUpdateMenu = () => {
  const [mutation] = useMutation<ApiMutation>(MenuQueries.UpdateMenuMutation);

  const updateMenu = (input: ApiUpdateMenuInput) => {
    return mutation({
      variables: { input },
      refetchQueries: getRefetchQueries(),
    });
  };

  return { updateMenu };
};
