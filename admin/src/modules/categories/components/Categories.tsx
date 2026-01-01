import {
  actionsColumn,
  getColumnSortProps,
  getDateColumns,
  getGalleryColumn,
  getNameColumn,
  renderOptions,
  slugColumn,
  statusColumn,
} from '@components/table/columns';
import { categoryColumns } from '@modules/categories/defs';
import { useCategories } from '@modules/categories/hooks/useCategories';
import { useCreateCategory } from '@modules/categories/hooks/useCreateCategory';
import {
  useCategoryDelete,
  useCategoriesDeleteMany,
} from '@hooks/useCategoryDelete';
import { ICategory } from '@src/entity/Category/Category';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { DrawerTypes } from '@src/layouts/drawers/types';
import { TableLayout } from '@src/layouts/table/components/TableLayout';
import { transformColumns } from '@src/utils/utils';
import { App } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

const Categories = () => {
  const { categories, loading, navigation, meta } = useCategories();
  const { formatMessage } = useIntl();

  const { selectedRows, onChangeSelectedRows } = navigation.selectedRowsProps;
  const { createCategory } = useCreateCategory();

  const { deleteManyCategories } = useCategoriesDeleteMany();
  const { deleteCategory } = useCategoryDelete();
  const { modal } = App.useApp();

  const columns: ColumnsType<ICategory> = [
    {
      ...getNameColumn({
        width: 300,
        coverPath: 'cover',
        onClick: (record) => {
          $drawers.addDrawer({
            entityId: record.id,
            type: DrawerTypes.CATEGORY,
          });
        },
      }),
      ...getColumnSortProps(categoryColumns.title.key, navigation.sortProps),
      key: categoryColumns.title.key,
      title: categoryColumns.title.label,
      width: categoryColumns.title.width,
    },
    {
      key: categoryColumns.gallery.key,
      title: categoryColumns.gallery.label,
      width: categoryColumns.gallery.width,
      render: (_: any, record) => {
        return getGalleryColumn(record.gallery || []);
      },
    },
    {
      ...statusColumn(),
      ...getColumnSortProps(categoryColumns.status.key, navigation.sortProps),
      key: categoryColumns.status.key,
      title: categoryColumns.status.label,
      width: categoryColumns.status.width,
    },
    {
      ...slugColumn,
      ...getColumnSortProps(categoryColumns.slug.key, navigation.sortProps),
      key: categoryColumns.slug.key,
      title: categoryColumns.slug.label,
      width: categoryColumns.slug.width,
    },
    ...getDateColumns({ sortProps: navigation.sortProps }),
    {
      key: categoryColumns.children.key,
      title: categoryColumns.children.label,
      dataIndex: 'categories',
      render: (_: any, record: ICategory) => {
        return renderOptions({
          options: record?.subcategories,
        });
      },
    },
    {
      key: categoryColumns.parent.key,
      title: categoryColumns.parent.label,
      dataIndex: 'parent',
      render: (_: any, record: ICategory) => {
        return renderOptions({
          options: record?.parents || [],
        });
      },
    },
    {
      fixed: 'right' as const,
      ...actionsColumn({
        settings: navigation.columnsProps,
        onDelete: async ({ id }: ICategory) => {
          const confirm = await modal.confirm({
            title: formatMessage({ id: t('common.confirm.deleteTitle') }),
            icon: null,
            content: formatMessage({ id: t('category.confirm.deleteOne') }),
          });
          if (!confirm) {
            return;
          }
          void deleteCategory(id);
        },
        onEdit: ({ id }: ICategory) => {
          $drawers.addDrawer({
            entityId: id,
            type: DrawerTypes.CATEGORY,
          });
        },
      }),
    },
  ];

  const activeColumns = transformColumns(
    navigation.columnsProps.value,
    columns,
  );

  const scrollX = activeColumns.reduce((acc, it) => {
    const option = categoryColumns?.[it.key as keyof typeof categoryColumns];
    if (!option) {
      return acc;
    }

    return option.isFixed ? acc : acc + (option?.width || 0) * 1.5;
  }, 0);

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
        name: 'categories',
        layout: 'fixed',
        scroll: { x: scrollX },
        sticky: true,
        loading,
        selectedRows,
        onChangeSelectedRows,
        columns: activeColumns,
        data: categories,
      }}
      navigationProps={{
        ...navigation,
        actionsProps: {
          onDelete: (ids: ID[]) => {
            deleteManyCategories(ids);
          },
        },
      }}
      headerProps={{
        title: formatMessage({ id: t('category.table.title') }),
        count: meta.total,
        create: async () => {
          const id = await createCategory();
          if (id) {
            $drawers.addDrawer({
              entityId: id,
              type: DrawerTypes.CATEGORY,
            });
          }
        },
      }}
    />
  );
};

// react-lazy
// eslint-disable-next-line import/no-default-export
export default Categories;
