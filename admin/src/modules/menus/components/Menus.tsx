import {
  actionsColumn,
  getColumnSortProps,
  getDateColumns,
  getNameColumn,
  renderOptions,
  statusColumn,
} from '@components/table/columns';
import { useMenus, useCreateMenu } from '@modules/menus/hooks/menu';
import { IMenu } from '@src/entity/Menu/Menu';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { DrawerTypes } from '@src/layouts/drawers/types';
import { TableLayout } from '@src/layouts/table/components/TableLayout';
import { ColumnsType } from 'antd/es/table';
import { App } from 'antd';
import { menuColumns } from '@modules/menus/defs';
import { transformColumns } from '@src/utils/utils';
// import { getRefetchQueries } from '@modules/app/components/Apollo';
import { useMenuDelete, useMenusDeleteMany } from '@hooks/useMenuDelete';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

const Menus = () => {
  const { formatMessage } = useIntl();
  const { options, loading, navigation, meta } = useMenus();
  const { selectedRows, onChangeSelectedRows } = navigation.selectedRowsProps;
  const { createMenu } = useCreateMenu();
  const { deleteManyMenus } = useMenusDeleteMany();
  const { deleteMenu } = useMenuDelete();
  const { modal } = App.useApp();

  const columns: ColumnsType<IMenu> = [
    {
      ...getNameColumn({
        onClick: ({ id }: IMenu) => {
          $drawers.addDrawer({
            entityId: id,
            type: DrawerTypes.MENU,
          });
        },
      }),
      ...getColumnSortProps(menuColumns.title.key, navigation.sortProps),
      key: menuColumns.title.key,
      title: menuColumns.title.label,
      width: menuColumns.title.width,
    },
    {
      ...statusColumn(),
      ...getColumnSortProps(menuColumns.status.key, navigation.sortProps),
      width: menuColumns.status.width,
      key: menuColumns.status.key,
      title: menuColumns.status.label,
    },
    {
      key: menuColumns.links.key,
      title: menuColumns.links.label,
      dataIndex: 'items',
      width: menuColumns.links.width,
      render: (items) => {
        return renderOptions({
          options: items,
          max: 3,
        });
      },
    },
    ...getDateColumns({ sortProps: navigation.sortProps }),
    {
      fixed: 'right' as const,
      ...actionsColumn({
        settings: navigation.columnsProps,
        onDelete: async ({ id }: IMenu) => {
          const confirm = await modal.confirm({
            title: formatMessage({ id: t('common.confirm.deleteTitle') }),
            icon: null,
            content: formatMessage({ id: t('menus.confirmDelete.content') }),
          });
          if (!confirm) {
            return;
          }
          void deleteMenu(id);
        },
        onEdit: ({ id }: IMenu) => {
          $drawers.addDrawer({
            entityId: id,
            type: DrawerTypes.MENU,
          });
        },
      }),
    },
  ];

  const activeColumns = transformColumns(
    navigation.columnsProps.value,
    columns,
  );

  return (
    <TableLayout
      paginationProps={{
        onChangePage: navigation.paginationProps.setPage,
        onChangePageSize: navigation.paginationProps.setPageSize,
        page: meta.page,
        pageSize: meta.pageSize,
        total: meta.total,
      }}
      tableProps={{
        name: 'menus',
        layout: 'fixed',
        sticky: true,
        loading,
        selectedRows,
        onChangeSelectedRows,
        columns: activeColumns,
        data: options,
      }}
      navigationProps={{
        ...navigation,
        actionsProps: {
          onDelete: (ids: ID[]) => {
            void deleteManyMenus(ids);
          },
        },
      }}
      headerProps={{
        title: formatMessage({ id: t('menus.title') }),
        count: meta.total,
        create: () => {
          createMenu().then((id) => {
            if (id) {
              $drawers.addDrawer({
                entityId: id,
                type: DrawerTypes.MENU,
              });
            }
          });
        },
      }}
    />
  );
};

// react-lazy
// eslint-disable-next-line import/no-default-export
export default Menus;
