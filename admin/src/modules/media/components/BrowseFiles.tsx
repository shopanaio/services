import { DropZoneMin } from '@components/media/modal/DropZoneMin';
import { getColumnSortProps } from '@components/table/columns';
import { TableImage } from '@components/table/image';
import { Box } from '@components/utility/Box';
import { useBrowseFiles } from '@modules/media/hooks/useBrowseFiles';
import { IMediaFile } from '@src/entity/MediaFile/MediaFile';
import { TableModal } from '@src/layouts/table/components/TableModal';
import { Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';

interface IBrowseFilesProps {
  onChange: (value: IMediaFile[]) => void;
  value: IMediaFile[];
  open: boolean;
  onClose: () => void;
  multiple?: boolean;
}

export const BrowseFiles = ({
  onChange,
  value = [],
  open,
  onClose,
  multiple,
}: IBrowseFilesProps) => {
  const { files, loading, navigation, meta } = useBrowseFiles({
    isActive: open,
    multiple,
    selectedRows: value,
  });

  const { selectedRowsProps, sortProps } = navigation;
  const { selectedRows, onChangeSelectedRows, onToggleSelectedRow } =
    selectedRowsProps;

  const columns: ColumnsType<IMediaFile> = [
    {
      render: (_: any, record: IMediaFile) => <TableImage file={record} />,
      title: 'Preview',
      dataIndex: '',
      key: 'cover',
      width: 70,
    },
    {
      render: (name: string) => (
        <Typography.Text strong>{name}</Typography.Text>
      ),
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      ...getColumnSortProps('name', sortProps),
    },
  ];

  return (
    <TableModal
      modalType="browse-files"
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
      slots={{
        nav: (
          <Box pb="4">
            <DropZoneMin
              onChange={(next) => onChange([...value, ...next])}
              multiple={multiple}
              onDone={onClose}
            />
          </Box>
        ),
      }}
      open={open}
      title="Browse files"
      loading={loading}
      tableProps={{
        name: 'browse-files',
        loading,
        selectedRows,
        onChangeSelectedRows,
        onRow: onToggleSelectedRow,
        columns,
        data: files,
      }}
      navigationProps={{
        ...navigation,
        actionsProps: {},
      }}
    />
  );
};
