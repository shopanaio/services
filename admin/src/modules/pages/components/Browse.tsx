import {
  getColumnSortProps,
  getCoverColumn,
  getNameColumn,
  statusColumn,
} from '@components/table/columns';
import { useBrowsePages } from '@modules/pages/hooks/useBrowse';
import { TableModal } from '@src/layouts/table/components/TableModal';
import { ColumnsType } from 'antd/es/table';
import { IPage } from '@src/entity/Page/Page';

interface IBrowsePagesProps {
  onChange: (value: IPage[]) => void;
  value: IPage[];
  open: boolean;
  onClose: () => void;
  multiple?: boolean;
}

export const BrowsePages = ({
  onChange,
  value = [],
  open,
  onClose,
  multiple,
}: IBrowsePagesProps) => {
  const { options, loading, navigation, meta } = useBrowsePages({
    multiple,
    isActive: open,
    value,
  });

  const { selectedRowsProps, sortProps } = navigation;
  const { selectedRows, onChangeSelectedRows, onToggleSelectedRow } =
    selectedRowsProps;

  const columns: ColumnsType<IPage> = [
    getCoverColumn(),
    {
      ...getNameColumn(),
      ...getColumnSortProps('title', sortProps),
    },
    {
      ...statusColumn({ width: 100 }),
      ...getColumnSortProps('status', sortProps),
    },
  ];

  return (
    <TableModal
      modalType="browse-pages"
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
      title="Browse pages"
      loading={loading}
      tableProps={{
        name: 'browse-pages',
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
