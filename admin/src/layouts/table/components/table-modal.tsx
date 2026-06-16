import { createStyles } from 'antd-style';
import { ButtonProps, Flex, Modal } from 'antd';
import { ReactNode } from 'react';
import { DataTable, IDataTableProps } from '@/layouts/table/components/table';
import { ITablePaginationProps, TablePagination } from '@/layouts/table/components/pagination';
import { TableBottomBorder, TableTopBorder } from '@/layouts/table/components/table-borders';

const useStyles = createStyles(({ token }) => ({
  container: {
    height: 'calc(100vh - 200px)',
    boxSizing: 'border-box',
    overflow: 'auto',
  },
  navigation: {
    position: 'sticky',
    padding: `${token.paddingSM}px 1px`,
    top: 0,
    background: token.colorBgLayout,
    zIndex: 100,
  },
  paper: {
    borderLeft: `1px solid ${token.colorBorder}`,
    borderRight: `1px solid ${token.colorBorder}`,
    boxShadow: 'none',
    background: token.colorBgContainer,
    borderRadius: token.borderRadius,
  },
}));

interface ITableModalProps<TData = any> {
  title: string;
  open: boolean;
  onCancel?: () => void;
  onOk: () => void;
  navigation?: ReactNode;
  loading?: boolean;
  tableProps: IDataTableProps<TData>;
  paginationProps?: ITablePaginationProps;
  okButtonProps?: ButtonProps;
  okButtonText?: string;
  width?: number | string;
  closable?: boolean;
  extra?: ReactNode;
  modalType?: string;
}

export const TableModal = ({
  modalType,
  title,
  open,
  onCancel,
  onOk,
  tableProps,
  navigation,
  paginationProps,
  okButtonText,
  okButtonProps,
  width,
  closable,
  extra,
}: ITableModalProps) => {
  const { styles } = useStyles();

  return (
    <Modal
      title={title}
      open={open}
      width={width || 1200}
      centered
      cancelButtonProps={{
        'data-testid': modalType
          ? `${modalType}-modal-cancel-button`
          : 'browse-modal-cancel-button',
      }}
      okButtonProps={{
        ...okButtonProps,
        'data-testid': modalType
          ? `${modalType}-modal-submit-button`
          : 'browse-modal-ok-button',
      }}
      okText={okButtonText}
      onCancel={onCancel}
      styles={{
        body: {
          background: 'var(--ant-color-bg-layout)',
        },
        footer: {
          background: 'var(--ant-color-bg-layout)',
        },
        header: {
          background: 'var(--ant-color-bg-layout)',
        },
      }}
      afterOpenChange={(isOpen) => {
        if (!isOpen) {
          onCancel?.();
        }
      }}
      closable={!!closable}
      onOk={onOk}
      footer={(_, { CancelBtn, OkBtn }) => (
        <Flex style={{ width: '100%' }} justify="space-between">
          {paginationProps ? <TablePagination {...paginationProps} /> : <div />}
          <Flex gap="small">
            {onCancel && <CancelBtn />}
            <OkBtn />
          </Flex>
        </Flex>
      )}
    >
      <div className={styles.container}>
        {navigation && (
          <div className={styles.navigation}>
            {navigation}
          </div>
        )}
        {extra}
        <TableTopBorder />
        <div className={styles.paper}>
          <DataTable
            layout="fixed"
            sticky={{ offsetHeader: 64 }}
            {...tableProps}
          />
        </div>
        <TableBottomBorder bottom={0} />
      </div>
    </Modal>
  );
};
