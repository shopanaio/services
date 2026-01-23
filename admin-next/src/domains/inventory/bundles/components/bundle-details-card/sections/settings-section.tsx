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
  tilesRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
  },
  tile: {
    flex: 1,
    minWidth: 120,
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },
  tileLabel: {
    fontSize: 11,
    color: token.colorTextTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  tileValue: {
    fontSize: 13,
    fontWeight: 600,
  },
  toggleStrip: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 8,
    background: token.colorFillQuaternary,
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px 20px",
  },
  toggleItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  toggleLabel: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  toggleDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  toggleOn: {
    background: token.colorSuccess,
  },
  toggleOff: {
    background: token.colorTextQuaternary,
  },
  toggleState: {
    fontSize: 11,
    fontWeight: 500,
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
// Sub-components
// ============================================================================

const ToggleIndicator = ({ active, label }: { active: boolean; label: string }) => {
  const { styles, cx } = useStyles();
  return (
    <div className={styles.toggleItem}>
      <div className={cx(styles.toggleDot, active ? styles.toggleOn : styles.toggleOff)} />
      <span className={styles.toggleLabel}>{label}</span>
      <Typography.Text
        type={active ? undefined : "secondary"}
        className={styles.toggleState}
      >
        {active ? "ON" : "OFF"}
      </Typography.Text>
    </div>
  );
};

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
      <Flex vertical gap={0}>
        <div className={styles.tilesRow}>
          <div className={styles.tile}>
            <span className={styles.tileLabel}>Display Style</span>
            <Tag className={styles.tileValue}>
              {DISPLAY_STYLE_LABELS[settings.displayStyle] ?? settings.displayStyle}
            </Tag>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileLabel}>Out of Stock</span>
            <Tag className={styles.tileValue}>
              {OUT_OF_STOCK_LABELS[settings.outOfStockBehavior] ?? settings.outOfStockBehavior}
            </Tag>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileLabel}>Inherit Stock</span>
            <Typography.Text className={styles.tileValue} type={settings.inheritStock ? undefined : "secondary"}>
              {settings.inheritStock ? "Active" : "Off"}
            </Typography.Text>
          </div>
          {settings.validationMessage && (
            <div className={styles.tile}>
              <span className={styles.tileLabel}>Validation</span>
              <Typography.Text className={styles.tileValue} ellipsis>
                {settings.validationMessage}
              </Typography.Text>
            </div>
          )}
        </div>

        <div className={styles.toggleStrip}>
          <ToggleIndicator active={settings.showImages} label="Images" />
          <ToggleIndicator active={settings.showSku} label="SKU" />
          <ToggleIndicator active={settings.showStock} label="Stock" />
          <ToggleIndicator active={settings.showComparePrice} label="Compare Price" />
        </div>
      </Flex>
    </Paper>
  );
};
