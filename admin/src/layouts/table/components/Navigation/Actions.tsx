import { Flex } from '@components/utility/Flex';
import { sanitizeEntries } from '@src/entity/utils';
import { mapEntryId } from '@src/utils/utils';
import { Button, Dropdown, Typography, App } from 'antd';
import { HiChevronDown } from 'react-icons/hi';
import { MdCheck, MdDeleteOutline, MdEditNote } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export interface IAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  'data-testid'?: string;
}

export interface IActionsProps {
  extraActions?: IAction[];
  transformRows?: (rows: any[]) => any[];
  onPublish?: (ids: ID[]) => void;
  onDraft?: (ids: ID[]) => void;
  onArchive?: (ids: ID[]) => void;
  onDelete?: (ids: ID[]) => void;
}

export const Actions = ({
  selectedRows,
  clearSelectedRows,
  extraActions = [],
  transformRows = (rows) => rows,
  onPublish,
  onDelete,
  onArchive,
  onDraft,
}: IActionsProps & { selectedRows: any[]; clearSelectedRows: () => void }) => {
  // const [open, setOpen] = useState(false);

  const { modal } = App.useApp();
  const { formatMessage } = useIntl();

  const actions = [];
  if (onPublish) {
    actions.push({
      icon: <MdCheck size={16} />,
      key: 'publish',
      label: formatMessage({ id: t('layouts.actions.publish') }),
      'data-testid': `action-publish`,
      onClick: async () => {
        const rows = sanitizeEntries(transformRows(selectedRows));
        onPublish(rows.map(mapEntryId));
        clearSelectedRows();
      },
    });
  }

  if (onDraft) {
    actions.push({
      icon: <MdEditNote size={16} />,
      key: 'draft',
      label: formatMessage({ id: t('layouts.actions.draft') }),
      'data-testid': `variant-action-draft`,
      onClick: async () => {
        const rows = sanitizeEntries(transformRows(selectedRows));
        onDraft(rows.map(mapEntryId));
        clearSelectedRows();
      },
    });
  }

  if (onArchive) {
    actions.push({
      icon: <MdDeleteOutline size={16} />,
      key: 'archive',
      label: formatMessage({ id: t('layouts.actions.archive') }),
      'data-testid': `variant-action-archive`,
      onClick: async () => {
        const rows = sanitizeEntries(transformRows(selectedRows));
        onArchive(rows.map(mapEntryId));
        clearSelectedRows();
      },
    });
  }

  if (onDelete) {
    actions.push({
      icon: <MdDeleteOutline size={16} />,
      key: 'delete',
      label: formatMessage({ id: t('layouts.actions.delete') }),
      'data-testid': `variant-action-archive`,
      onClick: async () => {
        const qnt = selectedRows.length;
        const confirm = await modal.confirm({
          icon: null,
          title: formatMessage({ id: t('common.confirm.deleteTitle') }),
          content: formatMessage(
            { id: t('layouts.actions.deleteConfirmContent') },
            { count: qnt, plural: qnt === 1 ? '' : 's' },
          ),
        });

        if (!confirm) {
          return;
        }

        const rows = sanitizeEntries(transformRows(selectedRows));
        onDelete(rows.map(mapEntryId));
        clearSelectedRows();
      },
    });
  }

  const items = [...actions, ...extraActions];

  const button = (
    <Button
      type="text"
      size="large"
      style={{ paddingRight: 'var(--x3)' }}
      data-testid="variant-actions-button"
    >
      <Flex gap="1" align="center">
        <Typography.Text strong>
          {formatMessage(
            { id: t('layouts.actions.selected') },
            { count: selectedRows.length },
          )}
        </Typography.Text>
        <HiChevronDown size={16} />
      </Flex>
    </Button>
  );

  if (!items.length) {
    return button;
  }

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      {button}
    </Dropdown>
  );
};
