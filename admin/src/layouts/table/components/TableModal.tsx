import { css } from '@emotion/react';
import { ButtonProps, Modal } from 'antd';
import {
  ITableNavigationProps,
  TableNavigation,
} from '@src/layouts/table/components/Navigation/Navigation';
import {
  DataTable,
  IDataTableProps,
} from '@src/layouts/table/components/Table';
import {
  ITablePaginationProps,
  TablePagination,
} from '@src/layouts/table/components/Pagination';
import { Flex } from '@components/utility/Flex';
import { Paper } from '@components/paper/Paper';
import { MouseEvent } from 'react';
import { getExpandRowButton, getTableCheckbox } from '@src/utils/utils';
import { TableBottomBorder, TableTopBorder } from '@src/layouts/table/components/TableBorders';

const s = {
  container: css`
    height: calc(100vh - 200px);
    box-sizing: border-box;
    overflow: auto;
    /* padding: 0 2px; */
  `,
};

interface ITableModalModalProps<TData = any> {
  title: string;
  open: boolean;
  onCancel?: () => void;
  onOk: () => void;
  navigationProps?: ITableNavigationProps;
  loading?: boolean;
  tableProps: IDataTableProps<TData>;
  paginationProps?: ITablePaginationProps;
  okButtonProps?: ButtonProps;
  okButtonText?: string;
  width?: number | string;
  closable?: boolean;
  slots?: {
    nav?: React.ReactNode;
  };
  modalType: string;
}

export const TableModal = ({
  modalType,
  title,
  open,
  onCancel,
  onOk,
  tableProps,
  navigationProps,
  paginationProps,
  okButtonText,
  okButtonProps,
  width,
  closable,
  slots,
}: ITableModalModalProps) => {
  return (
    <Modal
      title={title}
      open={open}
      width={width || 1200}
      centered
      transitionName="ant-fade"
      maskTransitionName="ant-fade"
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
      afterOpenChange={(open) => {
        if (!open) {
          onCancel?.();
        }
      }}
      closable={!!closable}
      onOk={onOk}
      footer={(_, { CancelBtn, OkBtn }) => (
        <Flex w="100%" justify="space-between">
          {paginationProps ? <TablePagination {...paginationProps} /> : <div />}
          <Flex gap="1">
            {onCancel && <CancelBtn />}
            <OkBtn />
          </Flex>
        </Flex>
      )}
    >
      <div css={s.container}>
        {navigationProps && (
          <div
            css={css`
              position: sticky;
              padding: var(--x3) 1px;
              top: 0;
              background: var(--bg-gradient);
              z-index: 100;
            `}
          >
            <TableNavigation {...navigationProps} />
          </div>
        )}
        {slots?.nav || null}
        <TableTopBorder />
        <Paper
          css={css`
            border-left: 1px solid var(--color-border);
            border-right: 1px solid var(--color-border);
            box-shadow: none;
          `}
        >
          <DataTable
            {...{
              layout: 'fixed',
              sticky: { offsetHeader: 64 },
              onRow: (_: any, e: MouseEvent) => {
                const targetCheckbox = getTableCheckbox(
                  e.target as HTMLElement,
                );

                if (targetCheckbox) {
                  targetCheckbox.click();
                  return;
                }

                if (tableProps.expandable) {
                  const expandButton = getExpandRowButton(
                    e.currentTarget as HTMLElement,
                  );

                  if (expandButton) {
                    expandButton.click();
                    return;
                  }
                }

                const checkbox = getTableCheckbox(
                  e.currentTarget as HTMLElement,
                );

                if (checkbox) {
                  checkbox.click();
                }
              },
              ...tableProps,
            }}
          />
        </Paper>
        <TableBottomBorder bottom={0} />
      </div>
    </Modal>
  );
};
