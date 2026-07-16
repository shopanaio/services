import { LuEllipsis as MoreOutlined } from "react-icons/lu";
import type { ApiApiKey } from "@/graphql/types";
import type { ColumnsType } from "antd/es/table";
import { Button, Dropdown, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { Paper } from "@/ui-kit/paper";
import { useApiKeyActionModal } from "../modals";

export const ApiKeysTable = ({
  apiKeys,
  loading,
  onSaved,
}: {
  apiKeys: ApiApiKey[];
  loading: boolean;
  onSaved: () => Promise<unknown>;
}) => {
  const actionModal = useApiKeyActionModal();
  const columns: ColumnsType<ApiApiKey> = [
    { dataIndex: "name", key: "name", title: "Name" },
    {
      dataIndex: "isBanned",
      key: "status",
      title: "Status",
      width: 120,
      render: (isBanned: boolean) => (
        <Tag color={isBanned ? "red" : "green"}>
          {isBanned ? "Revoked" : "Active"}
        </Tag>
      ),
    },
    {
      dataIndex: "dueDate",
      key: "dueDate",
      title: "Expiration",
      width: 170,
      render: (dueDate: string | null) => (
        <Typography.Text>
          {dueDate ? dayjs(dueDate).format("MMM DD, YYYY") : "No expiration"}
        </Typography.Text>
      ),
    },
    {
      dataIndex: "createdAt",
      key: "createdAt",
      title: "Created",
      width: 170,
      render: (createdAt: string) => dayjs(createdAt).format("MMM DD, YYYY"),
    },
    {
      align: "right",
      key: "actions",
      width: 64,
      render: (value, apiKey) => {
        void value;
        return (
          <Dropdown
            menu={{
              items: [
                {
                  key: "revoke",
                  disabled: apiKey.isBanned,
                  label: "Revoke API key",
                  onClick: () =>
                    actionModal.push({
                      action: "revoke",
                      apiKeyId: apiKey.id,
                      apiKeyName: apiKey.name,
                      onSaved,
                    }),
                },
                {
                  key: "delete",
                  danger: true,
                  label: "Delete API key",
                  onClick: () =>
                    actionModal.push({
                      action: "delete",
                      apiKeyId: apiKey.id,
                      apiKeyName: apiKey.name,
                      onSaved,
                    }),
                },
              ],
            }}
            trigger={["click"]}
          >
            <Button aria-label="API key actions" icon={<MoreOutlined />} type="text" />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <Paper data-testid="api-keys-section">
      <Table<ApiApiKey>
        columns={columns}
        dataSource={apiKeys}
        loading={loading}
        pagination={false}
        rowKey="id"
        tableLayout="fixed"
      />
    </Paper>
  );
};
