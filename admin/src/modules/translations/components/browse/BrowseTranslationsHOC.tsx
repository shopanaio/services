import { ApiCollectionMeta, EntityType } from '@src/graphql';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { DrawerTypes } from '@src/layouts/drawers/types';
import { ITableNavigationProps } from '@src/layouts/table/components/Navigation/Navigation';
import { TableLayout } from '@src/layouts/table/components/TableLayout';

export const createBrowseTranslateDrawerHOC = <T,>({
  title,
  entityType,
  useEntries,
}: {
  title: string;
  entityType: EntityType;
  useEntries: () => {
    options: T[];
    loading: boolean;
    navigation: Omit<ITableNavigationProps, 'actionsProps'>;
    meta: ApiCollectionMeta;
    columns: any[];
  };
}) => {
  const BrowseTranslateCategoriesDrawer = () => {
    const { options: data, loading, navigation, meta, columns } = useEntries();

    return (
      <TableLayout
        headerProps={{
          count: meta.total,
          title,
          loading,
        }}
        paginationProps={{
          onChangePage: navigation.paginationProps.setPage,
          page: meta.page,
          pageSize: 25,
          total: meta.total,
        }}
        loading={loading}
        tableProps={{
          name: 'browse-translations',
          loading,
          rowSelection: false,
          onRow: (record) => {
            $drawers.addDrawer({
              type: DrawerTypes.TRANSLATION,
              entityId: record.id,
              entityType,
            });
          },
          columns,
          data,
        }}
        navigationProps={{
          ...navigation,
          actionsProps: {},
        }}
      />
    );
  };

  return BrowseTranslateCategoriesDrawer;
};
