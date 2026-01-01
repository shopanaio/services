import { notify } from '@components/feedback/notification';
import { DraggableTable } from '@components/table/DraggableTable';
import { actionsColumn, dragIndicatorColumn } from '@components/table/columns';
import { css } from '@emotion/react';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import {
  CrmColumnModal,
  ICrmColumnFormValue,
} from '@modules/crm/components/CrmColumnModal';
import {
  useDeleteCrmColumn,
  useUpdateManyCrmColumns,
} from '@modules/crm/hooks/crm';
import { ICrmColumn } from '@src/entity/Order/Crm';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { getLastSortIndex } from '@src/utils/utils';
import { Button, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const CrmColumnSettings = () => {
  const { formatMessage } = useIntl();
  const [editingEntry, setEditingEntry] = useState<ICrmColumnFormValue | null>(
    null,
  );

  const { watch, setValue } = useFormContext();
  const { deleteColumn } = useDeleteCrmColumn();
  const { updateColumns } = useUpdateManyCrmColumns();

  const boards = watch('boards') || [];
  const setColumns = (value: ICrmColumn[]) => {
    setValue('boards', value, { shouldDirty: true });
  };

  const onDelete = (id: ID) => {
    deleteColumn(id, {
      refetchQueries: getRefetchQueries(),
      onCompleted: () => {},
      onError: () => {
        notify.error(formatMessage({ id: t('settings.crm.deleteFailed') }));
      },
    });
  };

  const onSort = (items: ICrmColumn[]) => {
    setColumns(items);

    updateColumns(
      items.map((it, idx) => ({ id: it.id, sortIndex: idx + 1 })),
      {
        refetchQueries: getRefetchQueries(),
        onCompleted: () => {},
        onError: () => {
          notify.error(formatMessage({ id: t('settings.crm.sortFailed') }));
        },
      },
    );
  };

  const onCreate = () => {
    setEditingEntry({
      id: null,
      title: '',
      slug: '',
      sortIndex: getLastSortIndex(boards),
      tickets: [],
    });
  };

  const onEdit = (method: ICrmColumn) => {
    setEditingEntry(method);
  };

  return (
    <DrawerPaper>
      <DrawerPaperHeader
        name="crm-columns"
        title={formatMessage({ id: t('settings.crm.columns') })}
        extra={<Button onClick={onCreate}>{formatMessage({ id: t('settings.crm.addColumn') })}</Button>}
      />
      {!!(boards || []).length && (
        <DraggableTable
          pagination={false}
          showHeader={false}
          dataSource={boards}
          setDataSource={onSort}
          columns={[
            dragIndicatorColumn,
            {
              title: formatMessage({ id: t('common.name') }),
              dataIndex: 'title',
              key: 'name',
              render: (_1: any, record: ICrmColumn, idx: number) => {
                return (
                  <Typography.Text>
                    {record.title}
                    {idx === 0 && (
                      <Tag
                        css={css`
                          margin-left: var(--x2);
                        `}
                        color="blue"
                      >
                        {formatMessage({ id: t('settings.crm.default') })}
                      </Tag>
                    )}
                  </Typography.Text>
                );
              },
            },

            actionsColumn({
              onEdit: (record: ICrmColumn) => {
                onEdit(record);
              },
              onDelete: (record: ICrmColumn) => {
                onDelete(record.id);
              },
            }),
          ]}
        />
      )}
      <CrmColumnModal
        open={!!editingEntry}
        entry={editingEntry}
        onClose={() => {
          setEditingEntry(null);
        }}
      />
    </DrawerPaper>
  );
};
