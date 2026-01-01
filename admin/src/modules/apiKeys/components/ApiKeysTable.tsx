import {
  actionsColumn,
  getDateColumns,
  getNameColumn,
} from '@components/table/columns';
import { IApiKey } from '@src/entity/ApiKey/ApiKey';
import { ColumnsType } from 'antd/es/table';
import { ApiKeyModal } from '@modules/apiKeys/components/Modal';
import { useState } from 'react';
import { DataTable } from '@src/layouts/table/components/Table';
import { PageLayout } from '@src/layouts/page/components/PageLayout';
import { Paper } from '@components/paper/Paper';
import { SettingsNav } from '@modules/settings/components/Nav';
import { SETTINGS_TABS } from '@modules/settings/defs';
import { useApiKeys } from '@modules/apiKeys/hooks/useApiKeys';
import {
  useDeleteApiKey,
  useRevokeApiKey,
} from '@modules/apiKeys/hooks/mutations';
import { notify } from '@components/feedback/notification';
import { Tag, Typography } from 'antd';
import { css } from '@emotion/react';
import dayjs from 'dayjs';

export const ApiKeysTable = () => {
  const { apiKeys, loading } = useApiKeys();
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState<IApiKey | null>(null);

  const { deleteApiKey } = useDeleteApiKey();
  const { revokeApiKey } = useRevokeApiKey();

  const columns: ColumnsType<IApiKey> = [
    {
      ...getNameColumn(),
      title: 'Name',
    },
    {
      title: 'Status',
      dataIndex: 'isBanned',
      key: 'status',
      ellipsis: true,
      render: (isBanned: string) => {
        return (
          <Tag
            style={{ minWidth: 70, textAlign: 'center', margin: 0 }}
            color={isBanned ? 'red' : 'green'}
          >
            {isBanned ? 'Revoked' : 'Active'}
          </Tag>
        );
      },
    },
    {
      ellipsis: true,
      title: 'Expiration',
      render: (date: Date) => {
        return (
          <Typography.Text
            css={css`
              font-size: 13px;
            `}
          >
            {date ? dayjs(date).format('MMM DD, YYYY') : 'No expiration'}
          </Typography.Text>
        );
      },
      dataIndex: 'dueDate',
      key: 'createdAt',
    },
    ...getDateColumns({ updated: false }),
    {
      fixed: 'right' as const,
      ...actionsColumn({
        items: [
          {
            label: 'Revoke api key',
            key: 'revoke',
            onClick: async ({ id }: IApiKey) => {
              try {
                await revokeApiKey(id);
                notify.success('Api key revoked');
              } catch {
                notify.error('Failed to revoke api key');
              }
            },
          },
          {
            label: 'Delete api key',
            key: 'delete',
            onClick: async ({ id }: IApiKey) => {
              try {
                await deleteApiKey(id);
                notify.success('Api key deleted');
              } catch {
                notify.error('Failed to delete api key');
              }
            },
          },
        ],
      }),
    },
  ];

  return (
    <>
      <ApiKeyModal
        open={apiKeyModalOpen}
        apiKey={editingApiKey}
        onClose={() => {
          setApiKeyModalOpen(false);
          setEditingApiKey(null);
        }}
      />
      <PageLayout
        errors={{}}
        name="apiKeys"
        headerProps={{
          switchLocale: false,
          status: false,
          submitButtonProps: {
            icon: null,
            children: 'Create',
            onClick: () => {
              setApiKeyModalOpen(true);
            },
          },
          title: 'ApiKeys',
        }}
        leftColumn={[
          <Paper>
            <DataTable
              {...{
                name: 'apiKeys',
                layout: 'fixed',
                sticky: true,
                loading,
                columns,
                data: apiKeys,
                rowSelection: true,
              }}
            />
          </Paper>,
        ]}
        rightColumn={
          <SettingsNav tab={SETTINGS_TABS.API_KEYS} isDirty={false} />
        }
      />
    </>
  );
};
