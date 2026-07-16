"use client";

import { LuPlus as PlusOutlined } from "react-icons/lu";
import { Alert, Button } from "antd";
import { useCallback } from "react";
import { DataLayout } from "@/layouts/data";
import { ApiKeysTable } from "../components";
import { useApiKeys } from "../hooks";
import { useCreateApiKeyModal } from "../modals";

export default function ApiKeysPage() {
  const { apiKeys, error, loading, refetch } = useApiKeys();
  const createModal = useCreateApiKeyModal();
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <DataLayout
      actions={
        <Button
          icon={<PlusOutlined />}
          onClick={() => createModal.push({ onSaved: refresh })}
          type="primary"
        >
          Create
        </Button>
      }
      name="system-api-keys"
      title="API Keys"
    >
      <DataLayout.Content>
        {error ? <Alert message={error.message} showIcon type="error" /> : null}
        <ApiKeysTable apiKeys={apiKeys} loading={loading} onSaved={refresh} />
      </DataLayout.Content>
    </DataLayout>
  );
}
