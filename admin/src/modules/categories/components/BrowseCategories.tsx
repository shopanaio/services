import {
  getColumnSortProps,
  getNameColumn,
  statusColumn,
} from '@components/table/columns';
import { useBrowseCategories } from '@modules/categories/hooks/useBrowseCategories';
import { IBrowseCategory } from '@src/entity/Category/BrowseCategory';
import { ICategory } from '@src/entity/Category/Category';
import { TableModal } from '@src/layouts/table/components/TableModal';
import { ColumnsType } from 'antd/es/table';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

interface IBrowseCategoriesProps {
  onChange: (value: IBrowseCategory[]) => void;
  value: ICategory[];
  open: boolean;
  onClose: () => void;
  multiple?: boolean;
}

export const BrowseCategories = ({
  onChange,
  value = [],
  open,
  onClose,
  multiple,
}: IBrowseCategoriesProps) => {
  const { options, loading, navigation, meta } = useBrowseCategories({
    isActive: open,
    multiple,
    selectedRows: value,
  });

  const { selectedRowsProps, sortProps } = navigation;
  const { selectedRows, onChangeSelectedRows, onToggleSelectedRow } =
    selectedRowsProps;

  const columns: ColumnsType<ICategory> = [
    {
      ...getNameColumn({ coverPath: 'cover' }),
      ...getColumnSortProps('title', sortProps),
    },
    {
      ...statusColumn({ width: 150 }),
      ...getColumnSortProps('status', sortProps),
    },
  ];

  return (
    <TableModal
      modalType="browse-categories"
      paginationProps={{
        onChangePage: navigation.paginationProps.setPage,
        page: meta.page,
        pageSize: 25,
        total: meta.total,
      }}
      onCancel={onClose}
      onOk={() => {
        onChange(selectedRows);
        onClose();
      }}
      open={open}
      title={<FormattedMessage id={t('category.browseCategories.title')} />}
      loading={loading}
      tableProps={{
        name: 'browse-categories',
        loading,
        selectedRows,
        onChangeSelectedRows,
        onRow: onToggleSelectedRow,
        columns,
        data: options,
      }}
      navigationProps={{
        ...navigation,
        actionsProps: {},
      }}
    />
  );
};
