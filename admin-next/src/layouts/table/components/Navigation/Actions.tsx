import { createStyles } from 'antd-style';
import { DownOutlined, CheckOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Dropdown, Flex, Typography, App } from 'antd';
import type { MenuProps } from 'antd';
import { ReactNode } from 'react';

const useStyles = createStyles({
  button: {
    paddingRight: 'var(--x3)',
  },
});

type MenuItem = Required<MenuProps>['items'][number];

export interface IAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  'data-testid'?: string;
}

export interface IActionsProps<T = any> {
  selectedRows: T[];
  clearSelectedRows: () => void;
  extraActions?: IAction[];
  onPublish?: (rows: T[]) => void;
  onDraft?: (rows: T[]) => void;
  onArchive?: (rows: T[]) => void;
  onDelete?: (rows: T[]) => void;
  selectedLabel?: string;
  publishLabel?: string;
  draftLabel?: string;
  archiveLabel?: string;
  deleteLabel?: string;
  deleteConfirmTitle?: string;
  deleteConfirmContent?: string;
}

export const Actions = <T extends { id?: string | number }>({
  selectedRows,
  clearSelectedRows,
  extraActions = [],
  onPublish,
  onDelete,
  onArchive,
  onDraft,
  selectedLabel = '{count} selected',
  publishLabel = 'Publish',
  draftLabel = 'Draft',
  archiveLabel = 'Archive',
  deleteLabel = 'Delete',
  deleteConfirmTitle = 'Confirm deletion',
  deleteConfirmContent = 'Are you sure you want to delete {count} item(s)?',
}: IActionsProps<T>) => {
  const { styles } = useStyles();
  const { modal } = App.useApp();

  const actions: IAction[] = [];

  if (onPublish) {
    actions.push({
      icon: <CheckOutlined />,
      key: 'publish',
      label: publishLabel,
      'data-testid': 'action-publish',
      onClick: () => {
        onPublish(selectedRows);
        clearSelectedRows();
      },
    });
  }

  if (onDraft) {
    actions.push({
      icon: <EditOutlined />,
      key: 'draft',
      label: draftLabel,
      'data-testid': 'action-draft',
      onClick: () => {
        onDraft(selectedRows);
        clearSelectedRows();
      },
    });
  }

  if (onArchive) {
    actions.push({
      icon: <DeleteOutlined />,
      key: 'archive',
      label: archiveLabel,
      'data-testid': 'action-archive',
      onClick: () => {
        onArchive(selectedRows);
        clearSelectedRows();
      },
    });
  }

  if (onDelete) {
    actions.push({
      icon: <DeleteOutlined />,
      key: 'delete',
      label: deleteLabel,
      'data-testid': 'action-delete',
      onClick: async () => {
        const count = selectedRows.length;
        const confirm = await modal.confirm({
          icon: null,
          title: deleteConfirmTitle,
          content: deleteConfirmContent.replace('{count}', String(count)),
        });

        if (!confirm) {
          return;
        }

        onDelete(selectedRows);
        clearSelectedRows();
      },
    });
  }

  const allActions = [...actions, ...extraActions];

  const items: MenuItem[] = allActions.map((action) => ({
    key: action.key,
    label: action.label,
    icon: action.icon,
    onClick: action.onClick,
  }));

  const button = (
    <Button
      type="text"
      size="large"
      className={styles.button}
      data-testid="actions-button"
    >
      <Flex gap="small" align="center">
        <Typography.Text strong>
          {selectedLabel.replace('{count}', String(selectedRows.length))}
        </Typography.Text>
        <DownOutlined />
      </Flex>
    </Button>
  );

  if (!allActions.length) {
    return button;
  }

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      {button}
    </Dropdown>
  );
};
