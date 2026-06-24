import React from "react";
import { createStyles } from "antd-style";
import { Popover, Checkbox, Divider, Typography, Button } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { useVariantsEditorStore } from "../hooks";
import {
  MEDIA_COLUMNS,
  PRICING_COLUMNS,
  INVENTORY_COLUMNS,
  ATTRIBUTES_COLUMNS,
} from "../config";
import type { IOptionGroup } from "../config/types";

const { Text } = Typography;

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  content: {
    width: 220,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    display: "block",
    marginBottom: 8,
    fontWeight: 500,
    color: token.colorTextSecondary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  checkboxGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  checkbox: {
    marginLeft: 0,
  },
}));

// ============================================================================
// Props
// ============================================================================

interface VariantsColumnSettingsProps {
  optionGroups: IOptionGroup[];
}

// ============================================================================
// Component
// ============================================================================

export const VariantsColumnSettings: React.FC<VariantsColumnSettingsProps> = ({
  optionGroups,
}) => {
  const { styles } = useStyles();

  const columnVisibility = useVariantsEditorStore((s) => s.columnVisibility);
  const toggleColumn = useVariantsEditorStore((s) => s.toggleColumn);
  const isOptionColumnVisible = useVariantsEditorStore(
    (s) => s.isOptionColumnVisible
  );
  const toggleOptionColumn = useVariantsEditorStore(
    (s) => s.toggleOptionColumn
  );

  const sections = [
    { title: "Options", columns: optionGroups, isOptions: true },
    { title: "Pricing", columns: PRICING_COLUMNS, isOptions: false },
    { title: "Inventory", columns: INVENTORY_COLUMNS, isOptions: false },
    { title: "Attributes", columns: ATTRIBUTES_COLUMNS, isOptions: false },
  ];

  const content = (
    <div className={styles.content}>
      {/* General section: Title + Media */}
      <div className={styles.section}>
        <Text className={styles.sectionTitle}>General</Text>
        <div className={styles.checkboxGroup}>
          <Checkbox checked disabled className={styles.checkbox}>
            Title
          </Checkbox>
          {MEDIA_COLUMNS.map((col) => (
            <Checkbox
              key={col.field}
              checked={columnVisibility[col.field]}
              onChange={() => toggleColumn(col.field)}
              className={styles.checkbox}
            >
              {col.headerName}
            </Checkbox>
          ))}
        </div>
      </div>

      {sections.map((section) => {
        // Skip options section if no option groups
        if (section.isOptions && optionGroups.length === 0) return null;
        if (section.columns.length === 0) return null;

        return (
          <React.Fragment key={section.title}>
            <Divider style={{ margin: "12px 0" }} />
            <div className={styles.section}>
              <Text className={styles.sectionTitle}>{section.title}</Text>
              <div className={styles.checkboxGroup}>
                {section.isOptions
                  ? optionGroups.map((group) => (
                      <Checkbox
                        key={group.name}
                        checked={isOptionColumnVisible(group.name)}
                        onChange={() => toggleOptionColumn(group.name)}
                        className={styles.checkbox}
                      >
                        {group.name}
                      </Checkbox>
                    ))
                  : (section.columns as typeof PRICING_COLUMNS).map((col) => (
                      <Checkbox
                        key={col.field}
                        checked={columnVisibility[col.field]}
                        onChange={() => toggleColumn(col.field)}
                        className={styles.checkbox}
                      >
                        {col.headerName}
                      </Checkbox>
                    ))}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <Popover
      content={content}
      title="Columns"
      trigger="click"
      placement="bottomLeft"
    >
      <Button size="small" icon={<SettingOutlined />} data-testid="variants-columns-button">
        Columns
      </Button>
    </Popover>
  );
};
