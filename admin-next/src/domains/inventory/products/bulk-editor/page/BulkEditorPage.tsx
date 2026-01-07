import React, { useCallback, useEffect } from "react";
import { createStyles } from "antd-style";
import { Button, Typography, Modal } from "antd";
import { ArrowLeftOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useBulkEditorStore } from "../hooks/useBulkEditorStore";
import { useBulkEditorData } from "../hooks/useBulkEditorData";
import { BulkEditorGrid } from "../components/BulkEditorGrid";
import { BulkEditorToolbar } from "../components/BulkEditorToolbar";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: token.colorBgLayout,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "16px 24px",
    backgroundColor: token.colorBgContainer,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  backButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    flex: 1,
  },
  title: {
    margin: "0 !important",
    fontSize: "18px !important",
    fontWeight: "600 !important",
  },
  subtitle: {
    color: token.colorTextSecondary,
    fontSize: 13,
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  gridContainer: {
    flex: 1,
    overflow: "hidden",
  },
}));

interface BulkEditorPageProps {
  onClose: () => void;
}

export const BulkEditorPage: React.FC<BulkEditorPageProps> = ({ onClose }) => {
  const { styles } = useStyles();
  const { productsCount, variantsCount } = useBulkEditorData();
  const hasChanges = useBulkEditorStore((s) => s.hasChanges());
  const closeEditor = useBulkEditorStore((s) => s.closeEditor);

  // Handle close with unsaved changes warning
  const handleClose = useCallback(() => {
    if (hasChanges) {
      Modal.confirm({
        title: "Unsaved changes",
        icon: <ExclamationCircleOutlined />,
        content: "You have unsaved changes. Are you sure you want to close?",
        okText: "Close without saving",
        cancelText: "Cancel",
        onOk: () => {
          closeEditor();
          onClose();
        },
      });
    } else {
      closeEditor();
      onClose();
    }
  }, [hasChanges, closeEditor, onClose]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleClose}
          className={styles.backButton}
        />
        <div className={styles.headerContent}>
          <Title level={4} className={styles.title}>
            Bulk Editor
          </Title>
          <Text className={styles.subtitle}>
            {productsCount} products, {variantsCount} variants
          </Text>
        </div>
      </div>

      <div className={styles.content}>
        <BulkEditorToolbar />
        <div className={styles.gridContainer}>
          <BulkEditorGrid />
        </div>
      </div>
    </div>
  );
};

export default BulkEditorPage;
