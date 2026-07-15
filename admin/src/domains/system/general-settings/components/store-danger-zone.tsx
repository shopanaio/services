import { Button, Flex, Typography } from "antd";
import { createStyles } from "antd-style";
import { Paper } from "@/ui-kit/paper";
import { useDeleteStoreModal } from "../modals";
import type { GeneralSettingsStore } from "../types";

const useStyles = createStyles(({ token }) => ({
  paper: {
    borderColor: token.colorError,
  },
  description: {
    margin: 0,
  },
}));

export const StoreDangerZone = ({
  store,
}: {
  store: GeneralSettingsStore;
}) => {
  const { styles } = useStyles();
  const deleteStoreModal = useDeleteStoreModal();

  return (
    <Paper className={styles.paper} data-testid="danger-zone-settings-section">
      <Flex align="center" gap={24} justify="space-between" wrap="wrap">
        <Flex vertical>
          <Typography.Text strong>Delete this store</Typography.Text>
          <Typography.Text className={styles.description}>
            Once you delete a store, there is no going back. Please be certain.
          </Typography.Text>
        </Flex>
        <Button
          danger
          ghost
          onClick={() =>
            deleteStoreModal.push({
              storeId: store.id,
              organizationId: store.organizationId,
              storeName: store.displayName,
            })
          }
        >
          Delete this store
        </Button>
      </Flex>
    </Paper>
  );
};
