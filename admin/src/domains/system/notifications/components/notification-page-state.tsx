"use client";

import { Alert, Skeleton } from "antd";
import { createStyles } from "antd-style";

const useStyles = createStyles(({ token }) => ({
  skeleton: {
    padding: token.padding,
  },
}));

export function NotificationPageState({
  error,
  loading,
}: {
  error: { message: string } | null;
  loading: boolean;
}) {
  const { styles } = useStyles();

  if (error) {
    return (
      <Alert
        description={error.message}
        message="Unable to load notification settings"
        showIcon
        type="error"
      />
    );
  }

  if (loading) {
    return (
      <div className={styles.skeleton}>
        <Skeleton active paragraph={{ rows: 6 }} title />
      </div>
    );
  }

  return null;
}
