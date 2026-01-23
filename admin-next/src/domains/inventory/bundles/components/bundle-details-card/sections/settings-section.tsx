"use client";

import { Typography, Flex, Tag } from "antd";
import { createStyles } from "antd-style";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import type { IBundleSettings } from "@/domains/inventory/products/modals/edit-components-modal/types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  settingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 0",
  },
  label: {
    color: token.colorTextSecondary,
  },
}));

// ============================================================================
// Display Labels
// ============================================================================

const DISPLAY_STYLE_LABELS: Record<string, string> = {
  accordion: "Accordion",
  tabs: "Tabs",
  flat: "Flat List",
  wizard: "Wizard",
};

const OUT_OF_STOCK_LABELS: Record<string, string> = {
  hide: "Hide",
  disable: "Disable",
  backorder: "Allow Backorder",
};

// ============================================================================
// Props
// ============================================================================

interface ISettingsSectionProps {
  settings: IBundleSettings;
  onEdit: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const SettingsSection = ({
  settings,
  onEdit,
}: ISettingsSectionProps) => {
  const { styles } = useStyles();

  return (
    <Paper>
      <PaperHeader
        title="Bundle Settings"
        actions={<EditAction onEdit={onEdit} label="Edit settings" />}
      />
      <Flex vertical gap={4}>
        <div className={styles.settingRow}>
          <Typography.Text className={styles.label}>Display Style</Typography.Text>
          <Tag>{DISPLAY_STYLE_LABELS[settings.displayStyle] ?? settings.displayStyle}</Tag>
        </div>
        <div className={styles.settingRow}>
          <Typography.Text className={styles.label}>Show Images</Typography.Text>
          <Tag color={settings.showImages ? "green" : undefined}>
            {settings.showImages ? "Yes" : "No"}
          </Tag>
        </div>
        <div className={styles.settingRow}>
          <Typography.Text className={styles.label}>Show SKU</Typography.Text>
          <Tag color={settings.showSku ? "green" : undefined}>
            {settings.showSku ? "Yes" : "No"}
          </Tag>
        </div>
        <div className={styles.settingRow}>
          <Typography.Text className={styles.label}>Show Stock</Typography.Text>
          <Tag color={settings.showStock ? "green" : undefined}>
            {settings.showStock ? "Yes" : "No"}
          </Tag>
        </div>
        <div className={styles.settingRow}>
          <Typography.Text className={styles.label}>Out of Stock</Typography.Text>
          <Tag>{OUT_OF_STOCK_LABELS[settings.outOfStockBehavior] ?? settings.outOfStockBehavior}</Tag>
        </div>
        <div className={styles.settingRow}>
          <Typography.Text className={styles.label}>Inherit Stock</Typography.Text>
          <Tag color={settings.inheritStock ? "green" : undefined}>
            {settings.inheritStock ? "Yes" : "No"}
          </Tag>
        </div>
      </Flex>
    </Paper>
  );
};
