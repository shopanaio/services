import {
  actionsColumn,
  getColumnSortProps,
  getDateColumns,
} from '@components/table/columns';
import { useFiles } from '@modules/media/hooks/useFiles';
import { TableLayout } from '@src/layouts/table/components/TableLayout';
import { ColumnsType } from 'antd/es/table';
import { TableImage } from '@components/table/image';
import { IMediaFile } from '@src/entity/MediaFile/MediaFile';
import { App, Typography } from 'antd';
import { useState } from 'react';
import { useFileDelete, useFilesDeleteMany } from '@hooks/useFileDelete';
import { round } from 'lodash';
import { FileDriver } from '@src/graphql';
import { BrowseMediaModal } from '@components/media/modal/BrowseModal';
import { MdUpload } from 'react-icons/md';

const MediaFiles = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const { files, loading, navigation, meta, refetch } = useFiles();
  const { deleteManyFiles } = useFilesDeleteMany();
  const { deleteFile } = useFileDelete();
  const { modal } = App.useApp();

  const { selectedRows, onChangeSelectedRows, onToggleSelectedRow } =
    navigation.selectedRowsProps;

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
      ...getColumnSortProps('name', navigation.sortProps),
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (size: number, record: IMediaFile) => {
        if (record.driver !== FileDriver.S3 || !size) {
          return null;
        }

        const kb = size * 0.001;
        return (
          <Typography.Text>{round(kb, kb < 1 ? 2 : 0)} KB</Typography.Text>
        );
      },
    },
    ...getDateColumns({
      updated: false,
      sortProps: navigation.sortProps,
    }),
    actionsColumn({
      onDelete: async ({ id }: IMediaFile) => {
        const confirm = await modal.confirm({
          title: 'Are you sure?',
          icon: null,
          content: `Are you about to delete 1 file.`,
        });
        if (!confirm) {
          return;
        }
        void deleteFile(id);
      },
    }),
  ];

  return (
    <>
      <TableLayout
        paginationProps={{
          onChangePage: navigation.paginationProps.setPage,
          onChangePageSize: navigation.paginationProps.setPageSize,
          page: meta.page,
          pageSize: meta.pageSize,
          total: meta.total,
        }}
        tableProps={{
          name: 'media-files',
          layout: 'fixed',
          sticky: true,
          loading,
          selectedRows,
          onChangeSelectedRows,
          onRow: onToggleSelectedRow,
          columns,
          data: files,
        }}
        navigationProps={{
          ...navigation,
          actionsProps: {
            onDelete: (ids: ID[]) => {
              deleteManyFiles(ids);
            },
          },
        }}
        headerProps={{
          title: 'Files',
          count: meta.total,
          createButtonProps: {
            icon: <MdUpload />,
            children: 'Upload',
          },
          create: () => {
            setModalOpen(true);
          },
        }}
      />
      <BrowseMediaModal
        onCancel={() => setModalOpen(false)}
        onChange={() => {
          refetch();
        }}
        open={modalOpen}
        multiple
        title="Upload media"
        value={[]}
      />
    </>
  );
};

// react-lazy
// eslint-disable-next-line import/no-default-export
export default MediaFiles;
