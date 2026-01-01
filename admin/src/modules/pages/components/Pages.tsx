import {
  actionsColumn,
  getColumnSortProps,
  getCoverColumn,
  getDateColumns,
  getGalleryColumn,
  getNameColumn,
  slugColumn,
  statusColumn,
} from '@components/table/columns';
import { usePages } from '@modules/pages/hooks/usePages';
import { IPage } from '@src/entity/Page/Page';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { DrawerTypes } from '@src/layouts/drawers/types';
import { TableLayout } from '@src/layouts/table/components/TableLayout';
import { ColumnsType } from 'antd/es/table';
import { App } from 'antd';
import { pageColumns } from '@modules/pages/defs';
import { transformColumns } from '@src/utils/utils';
// import { getRefetchQueries } from '@modules/app/components/Apollo';
import { useCreatePage } from '@modules/pages/hooks/useCreate';
import { usePageDelete, usePagesDeleteMany } from '@hooks/usePageDelete';

const Pages = () => {
  const { pages, loading, navigation, meta } = usePages();
  const { selectedRows, onChangeSelectedRows } = navigation.selectedRowsProps;
  const { createPage } = useCreatePage();
  const { deleteManyPages } = usePagesDeleteMany();
  const { deletePage } = usePageDelete();
  const { modal } = App.useApp();

  const columns: ColumnsType<IPage> = [
    {
      ...getNameColumn({
        coverPath: 'cover',
        onClick: ({ id }: IPage) => {
          $drawers.addDrawer({
            entityId: id,
            type: DrawerTypes.PAGE,
          });
        },
      }),
      ...getColumnSortProps(pageColumns.title.key, navigation.sortProps),
      key: pageColumns.title.key,
      title: pageColumns.title.label,
      width: pageColumns.title.width,
    },
    {
      ...statusColumn(),
      ...getColumnSortProps(pageColumns.status.key, navigation.sortProps),
      width: pageColumns.status.width,
      key: pageColumns.status.key,
      title: pageColumns.status.label,
    },
    {
      key: pageColumns.gallery.key,
      title: pageColumns.gallery.label,
      width: pageColumns.gallery.width,
      render: (_: any, record) => {
        return getGalleryColumn(record.gallery || []);
      },
    },
    {
      ...slugColumn,
      ...getColumnSortProps(pageColumns.slug.key, navigation.sortProps),
      key: pageColumns.slug.key,
      title: pageColumns.slug.label,
      width: pageColumns.slug.width,
    },
    ...getDateColumns({ sortProps: navigation.sortProps }),
    {
      fixed: 'right' as const,
      ...actionsColumn({
        settings: navigation.columnsProps,
        onDelete: async ({ id }: IPage) => {
          const confirm = await modal.confirm({
            title: 'Are you sure?',
            icon: null,
            content: `Are you about to delete 1 page.`,
          });
          if (!confirm) {
            return;
          }
          void deletePage(id);
        },
        onEdit: ({ id }: IPage) => {
          $drawers.addDrawer({
            entityId: id,
            type: DrawerTypes.PAGE,
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
        name: 'pages',
        layout: 'fixed',
        sticky: true,
        loading,
        selectedRows,
        onChangeSelectedRows,
        columns: activeColumns,
        data: pages,
      }}
      navigationProps={{
        ...navigation,
        actionsProps: {
          onDelete: (ids: ID[]) => {
            void deleteManyPages(ids);
          },
        },
      }}
      headerProps={{
        title: 'Pages',
        count: meta.total,
        create: () => {
          createPage().then((id) => {
            $drawers.addDrawer({
              entityId: id,
              type: DrawerTypes.PAGE,
            });
          });
        },
      }}
    />
  );
};

// react-lazy
// eslint-disable-next-line import/no-default-export
export default Pages;
