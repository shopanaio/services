"use client";

import { createStyles } from "antd-style";
import {
  Typography,
  Radio,
  Checkbox,
  Select,
  Tooltip,
  Flex,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

import { Paper } from "../../../components/paper";
import type { DisplayStyle, OutOfStockBehavior } from "../types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  settingsGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  settingRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
  },
  settingLabel: {
    flex: 1,
  },
  radioGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  radioOption: {
    padding: "12px 16px",
    border: `1px solid ${token.colorBorder}`,
    borderRadius: token.borderRadius,
    cursor: "pointer",
    transition: "all 0.2s",
    "&:hover": {
      borderColor: token.colorPrimary,
    },
  },
  radioOptionSelected: {
    borderColor: token.colorPrimary,
    backgroundColor: "rgba(22, 119, 255, 0.04)",
  },
  radioLabel: {
    fontWeight: 500,
    marginBottom: 4,
  },
  radioDescription: {
    fontSize: 12,
    color: token.colorTextSecondary,
    marginLeft: 24,
  },
  selectRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  selectLabel: {
    minWidth: 140,
  },
  select: {
    width: 200,
  },
  checkboxDescription: {
    fontSize: 12,
    color: token.colorTextSecondary,
    marginLeft: 24,
  },
}));

// ============================================================================
// Types
// ============================================================================

interface ISettingsTabProps {
  displayStyle: DisplayStyle;
  onDisplayStyleChange: (style: DisplayStyle) => void;
  showImages: boolean;
  onShowImagesChange: (value: boolean) => void;
  showSku: boolean;
  onShowSkuChange: (value: boolean) => void;
  showStock: boolean;
  onShowStockChange: (value: boolean) => void;
  showComparePrice: boolean;
  onShowComparePriceChange: (value: boolean) => void;
  outOfStockBehavior: OutOfStockBehavior;
  onOutOfStockBehaviorChange: (value: OutOfStockBehavior) => void;
  inheritStock: boolean;
  onInheritStockChange: (value: boolean) => void;
}

// ============================================================================
// Display Style Options
// ============================================================================

const DISPLAY_STYLE_OPTIONS = [
  { value: "accordion", label: "Accordion", description: "Groups displayed as collapsible sections" },
  { value: "tabs", label: "Tabs", description: "Groups displayed as horizontal tabs" },
  { value: "flat", label: "Flat List", description: "All groups visible in a single list" },
  { value: "wizard", label: "Wizard", description: "Step-by-step selection process" },
];

// ============================================================================
// Out of Stock Options
// ============================================================================

const OUT_OF_STOCK_OPTIONS = [
  {
    value: "hide",
    label: "Hide",
    description: "Hide unavailable items from the storefront. Customers won't see out-of-stock options.",
  },
  {
    value: "disable",
    label: "Disable",
    description: "Show items as disabled/grayed out. Customers can see them but cannot select.",
  },
  {
    value: "backorder",
    label: "Allow Backorder",
    description: "Allow customers to select out-of-stock items. They can still purchase with extended delivery.",
  },
];

// ============================================================================
// Component
// ============================================================================

export const SettingsTab = ({
  displayStyle,
  onDisplayStyleChange,
  showImages,
  onShowImagesChange,
  showSku,
  onShowSkuChange,
  showStock,
  onShowStockChange,
  showComparePrice,
  onShowComparePriceChange,
  outOfStockBehavior,
  onOutOfStockBehaviorChange,
  inheritStock,
  onInheritStockChange,
}: ISettingsTabProps) => {
  const { styles, cx } = useStyles();

  return (
    <div className={styles.container}>
      {/* Display Settings */}
      <Paper>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <Typography.Text strong>Display Settings</Typography.Text>
            <Tooltip title="Configure how components are displayed on the storefront">
              <InfoCircleOutlined style={{ color: "var(--ant-color-text-secondary)" }} />
            </Tooltip>
          </div>

          <div className={styles.settingsGroup}>
            {/* Display Style Select */}
            <div className={styles.selectRow}>
              <Typography.Text className={styles.selectLabel}>Display Style</Typography.Text>
              <Select
                value={displayStyle}
                onChange={onDisplayStyleChange}
                className={styles.select}
                options={DISPLAY_STYLE_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: (
                    <Flex vertical>
                      <span>{opt.label}</span>
                    </Flex>
                  ),
                }))}
              />
            </div>

            {/* Checkboxes */}
            <Checkbox checked={showImages} onChange={(e) => onShowImagesChange(e.target.checked)}>
              Show product images
            </Checkbox>

            <Checkbox checked={showSku} onChange={(e) => onShowSkuChange(e.target.checked)}>
              Show product SKU/article numbers
            </Checkbox>

            <Checkbox checked={showStock} onChange={(e) => onShowStockChange(e.target.checked)}>
              Show stock availability
            </Checkbox>

            <Checkbox checked={showComparePrice} onChange={(e) => onShowComparePriceChange(e.target.checked)}>
              Show compare-at (strikethrough) prices
            </Checkbox>
          </div>
        </div>
      </Paper>

      {/* Stock & Availability */}
      <Paper>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <Typography.Text strong>Stock & Availability</Typography.Text>
            <Tooltip title="Configure how out-of-stock items are handled">
              <InfoCircleOutlined style={{ color: "var(--ant-color-text-secondary)" }} />
            </Tooltip>
          </div>

          <Typography.Text type="secondary" style={{ marginBottom: 8 }}>
            Out of stock behavior
          </Typography.Text>

          <Radio.Group
            value={outOfStockBehavior}
            onChange={(e) => onOutOfStockBehaviorChange(e.target.value)}
            className={styles.radioGroup}
          >
            {OUT_OF_STOCK_OPTIONS.map((option) => (
              <div
                key={option.value}
                className={cx(
                  styles.radioOption,
                  outOfStockBehavior === option.value && styles.radioOptionSelected
                )}
                onClick={() => onOutOfStockBehaviorChange(option.value as OutOfStockBehavior)}
              >
                <Radio value={option.value}>
                  <span className={styles.radioLabel}>{option.label}</span>
                </Radio>
                <div className={styles.radioDescription}>{option.description}</div>
              </div>
            ))}
          </Radio.Group>

          <div className={styles.settingsGroup} style={{ marginTop: 16 }}>
            <Checkbox checked={inheritStock} onChange={(e) => onInheritStockChange(e.target.checked)}>
              Inherit stock tracking from source products
              <div className={styles.checkboxDescription}>
                Component availability will sync automatically with product inventory
              </div>
            </Checkbox>
          </div>
        </div>
      </Paper>

    </div>
  );
};

export default SettingsTab;
