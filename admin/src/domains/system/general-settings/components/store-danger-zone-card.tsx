"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, App, Button, Input, Modal, Typography } from "antd";
import { createStyles } from "antd-style";
import type { ApiStore } from "@/graphql/types";
import { useDeleteStore, useWorkspace } from "@/domains/workspace";
import { Paper, PaperHeader } from "@/ui-kit/paper";

const useStyles = createStyles(({ token }) => ({
  paper: {
    padding: 0,
    overflow: "hidden",
    borderColor: token.colorErrorBorder,
    boxShadow: "none",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    minHeight: 75,
    marginInline: 16,
  },
  rowDivider: { borderBottom: `1px solid ${token.colorBorderSecondary}` },
  copy: { display: "flex", flex: 1, flexDirection: "column", gap: 2, minWidth: 0 },
  label: { fontSize: 13, fontWeight: 500, lineHeight: "20px" },
  description: { color: token.colorTextSecondary, fontSize: 12, lineHeight: "18px" },
  modal: {
    "& .ant-modal-content": { padding: 0, overflow: "hidden" },
    "& .ant-modal-header": {
      height: 50,
      margin: 0,
      padding: "14px 16px",
      borderBottom: `1px solid ${token.colorBorderSecondary}`,
    },
    "& .ant-modal-body": { padding: "16px 16px 0" },
    "& .ant-modal-footer": {
      margin: "20px 16px 0",
      padding: "18px 0 42px",
      borderTop: `1px solid ${token.colorBorderSecondary}`,
    },
  },
  modalCopy: { marginBottom: 12, fontSize: 13, lineHeight: "20px" },
  warning: { marginBottom: 12 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  fieldLabel: { fontSize: 13, fontWeight: 500, lineHeight: "20px" },
  hint: { color: token.colorTextSecondary, fontSize: 12, lineHeight: "18px" },
}));

interface StoreDangerZoneCardProps {
  store: ApiStore;
}

export const StoreDangerZoneCard = ({ store }: StoreDangerZoneCardProps) => {
  const { styles, cx } = useStyles();
  const { message } = App.useApp();
  const router = useRouter();
  const { organization } = useWorkspace();
  const deleteMutation = useDeleteStore();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isConfirmed = confirmation === store.name;

  const closeDeleteModal = () => {
    if (deleteMutation.loading) return;
    setDeleteModalOpen(false);
    setConfirmation("");
    setDeleteError(null);
  };

  const deleteStore = async () => {
    if (!isConfirmed || !organization?.id) return;
    setDeleteError(null);
    const result = await deleteMutation.deleteStore({
      id: store.id,
      organizationId: organization.id,
    });
    if (!result.deletedStoreId || result.userErrors.length > 0) {
      setDeleteError(
        result.userErrors.map(({ message: errorMessage }) => errorMessage).join("\n") ||
          deleteMutation.error?.message ||
          "The store could not be deleted.",
      );
      return;
    }
    message.success("Store deleted");
    setDeleteModalOpen(false);
    router.push("/workspace");
  };

  return (
    <>
      <Paper className={styles.paper} data-testid="store-danger-zone-card">
        <PaperHeader contained title="Danger zone" />
        <div className={cx(styles.row, styles.rowDivider)}>
          <div className={styles.copy}>
            <span className={styles.label}>Transfer store</span>
            <span className={styles.description}>
              Transfer ownership to another person. You will remain as a collaborator.
            </span>
          </div>
          <Button danger disabled size="small">
            Manage
          </Button>
        </div>
        <div className={styles.row}>
          <div className={styles.copy}>
            <span className={styles.label}>Delete store</span>
            <span className={styles.description}>
              Permanently delete this store and all of its data. This cannot be undone.
            </span>
          </div>
          <Button danger onClick={() => setDeleteModalOpen(true)} size="small">
            Delete store
          </Button>
        </div>
      </Paper>

      <Modal
        centered
        className={styles.modal}
        destroyOnHidden
        footer={[
          <Button key="cancel" onClick={closeDeleteModal} size="small">
            Cancel
          </Button>,
          <Button
            danger
            disabled={!isConfirmed || !organization?.id}
            key="delete"
            loading={deleteMutation.loading}
            onClick={deleteStore}
            size="small"
            type="primary"
          >
            Delete store
          </Button>,
        ]}
        onCancel={closeDeleteModal}
        open={deleteModalOpen}
        title="Delete store permanently"
        width={800}
      >
        <Typography.Paragraph className={styles.modalCopy}>
          This permanently deletes “{store.name}”, including products, orders, customers, settings,
          integrations, and media.
        </Typography.Paragraph>
        <Alert
          className={styles.warning}
          description="All store data and access will be removed immediately and permanently."
          message="There is no recovery after deletion"
          showIcon
          type="error"
        />
        {deleteError ? (
          <Alert className={styles.warning} message={deleteError} showIcon type="error" />
        ) : null}
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Type {store.name} to confirm</span>
          <Input
            autoComplete="off"
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={store.name}
            status={confirmation && !isConfirmed ? "error" : undefined}
            value={confirmation}
          />
          <span className={styles.hint}>
            The value must match exactly. Delete store remains disabled until validation passes.
          </span>
        </label>
      </Modal>
    </>
  );
};
