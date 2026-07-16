"use client";

import { LuStore as ShopOutlined } from "react-icons/lu";
import { Alert, App, Avatar, Button, Flex, Typography } from "antd";
import { createStyles } from "antd-style";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { useDeleteStore } from "../../hooks";
import type { DeleteStoreModalPayload } from "../../modals";

const useStyles = createStyles(({ token }) => ({
  avatar: {
    background: token.colorErrorBg,
    color: token.colorError,
  },
  content: {
    paddingBlock: token.paddingSM,
  },
}));

export const DeleteStoreModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop } = useModalStackContext();
  const typedPayload = payload as DeleteStoreModalPayload;
  const mutation = useDeleteStore();

  const submit = async () => {
    const result = await mutation.deleteStore({
      id: typedPayload.storeId,
      organizationId: typedPayload.organizationId,
    });
    if (!result.data) return;

    await typedPayload.onSaved?.();
    message.success("Store deleted");
    forcePop();
  };

  return (
    <ModalLayout
      name="delete-store"
      header={
        <ModalHeader
          onClose={pop}
          submitButtonProps={null}
          title="Delete store"
        />
      }
    >
      {mutation.error ? (
        <Alert message={mutation.error.message} showIcon type="error" />
      ) : null}
      <Paper>
        <Flex
          align="center"
          className={styles.content}
          gap={16}
          vertical
        >
          <Avatar
            className={styles.avatar}
            icon={<ShopOutlined />}
            shape="square"
            size="large"
          />
          <Typography.Title level={4} style={{ margin: 0 }}>
            {typedPayload.storeName}
          </Typography.Title>
          <Typography.Text>I want to delete this store</Typography.Text>
          <Button
            block
            danger
            ghost
            loading={mutation.loading}
            onClick={submit}
          >
            Delete this store
          </Button>
        </Flex>
      </Paper>
    </ModalLayout>
  );
};
