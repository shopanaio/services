import { getColumnSortProps } from '@components/table/columns';
import { useBrowseTags } from '@modules/tags/hooks/useBrowse';
import { IEntryOption } from '@src/entity/EntryOption/EntryOption';
import { TableModal } from '@src/layouts/table/components/TableModal';
import { ColumnsType } from 'antd/es/table';
import { ITag } from '@src/entity/Tag/Tag';
import { tagColumns } from '@modules/tags/defs';

interface IBrowseTagsProps {
  onChange: (value: ITag[]) => void;
  value: ITag[];
  open: boolean;
  onClose: () => void;
  multiple?: boolean;
}

export const BrowseTags = ({
  onChange,
  value = [],
  open,
  onClose,
  multiple,
}: IBrowseTagsProps) => {
  const { options, loading, navigation, meta } = useBrowseTags({
    multiple,
    isActive: open,
    value,
  });

  const { selectedRowsProps, sortProps } = navigation;
  const { selectedRows, onChangeSelectedRows } = selectedRowsProps;

  const columns: ColumnsType<IEntryOption> = [
    {
      dataIndex: 'title',
      key: tagColumns.slug.key,
      title: tagColumns.slug.label,
      ...getColumnSortProps(tagColumns.slug.key, sortProps),
    },
  ];

  return (
    <TableModal
      modalType="browse-tags"
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
      title="Browse tags"
      loading={loading}
      tableProps={{
        name: 'tags',
        loading,
        selectedRows,
        onChangeSelectedRows,
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
