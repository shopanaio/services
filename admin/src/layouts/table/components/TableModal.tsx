import { createStyles } from 'antd-style';
import { ButtonProps, Flex, Modal, ModalProps } from 'antd';
import { ReactNode, CSSProperties } from 'react';
import { ITableNavigationProps, TableNavigation } from '@/layouts/table/components/Navigation/Navigation';
import { DataTable, IDataTableProps } from '@/layouts/table/components/Table';
import { ITablePaginationProps, TablePagination } from '@/layouts/table/components/Pagination';
import { TableBottomBorder, TableTopBorder } from '@/layouts/table/components/TableBorders';

const useStyles = createStyles({
  container: {
    height: 'calc(100vh - 200px)',
    boxSizing: 'border-box',
    overflow: 'auto',
  },
  navigation: {
    position: 'sticky',
    padding: 'var(--x3) 1px',
    top: 0,
    background: 'var(--bg-gradient)',
    zIndex: 100,
  },
  paper: {
    borderLeft: '1px solid var(--color-border)',
    borderRight: '1px solid var(--color-border)',
    boxShadow: 'none',
    background: 'var(--color-bg-container)',
    borderRadius: 'var(--radius-base)',
  },
});

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
        content: {
          background: 'var(--bg-gradient)',
        },
        footer: {
          background: 'var(--bg-gradient)',
        },
        header: {
          background: 'var(--bg-gradient)',
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
