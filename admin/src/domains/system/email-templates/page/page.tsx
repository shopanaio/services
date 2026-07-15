"use client";

import { Alert } from "antd";
import { createStyles } from "antd-style";
import { useCallback } from "react";
import { DataLayout } from "@/layouts/data";
import { useEmailTemplates } from "../../email/hooks";
import { EmailTemplatesTable } from "../components";

const useStyles = createStyles(({ token }) => ({
  content: { paddingBottom: token.padding },
}));

export default function EmailTemplatesPage() {
  const { styles } = useStyles();
  const { error, loading, refetch, templates } = useEmailTemplates();
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <DataLayout name="email-templates" title="Email Templates">
      <DataLayout.Content className={styles.content}>
        {error ? <Alert message={error.message} showIcon type="error" /> : null}
        <EmailTemplatesTable
          loading={loading}
          onSaved={refresh}
          templates={templates}
        />
      </DataLayout.Content>
    </DataLayout>
  );
}
