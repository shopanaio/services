import React from "react";
import { createStyles } from "antd-style";
import { Popover, Checkbox, Button, Divider, Typography } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { useVariantsEditorStore } from "../hooks";
import { VARIANT_COLUMNS, type IOptionGroup } from "../config";

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
  footer: {
    paddingTop: 8,
  },
  resetButton: {
    width: "100%",
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
  const resetColumnsToDefault = useVariantsEditorStore(
    (s) => s.resetColumnsToDefault
  );

  const content = (
    <div className={styles.content}>
      {/* Options section (dynamic) */}
      {optionGroups.length > 0 && (
        <>
          <div className={styles.section}>
            <Text className={styles.sectionTitle}>Options</Text>
            <div className={styles.checkboxGroup}>
              {optionGroups.map((group) => (
                <Checkbox
                  key={group.name}
                  checked={isOptionColumnVisible(group.name)}
                  onChange={() => toggleOptionColumn(group.name)}
                  className={styles.checkbox}
                >
                  {group.name}
                </Checkbox>
              ))}
            </div>
          </div>
          <Divider style={{ margin: "12px 0" }} />
        </>
      )}

      {/* Variant columns section */}
      <div className={styles.section}>
        <Text className={styles.sectionTitle}>Variant</Text>
        <div className={styles.checkboxGroup}>
          {VARIANT_COLUMNS.map((col) => (
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

      <Divider style={{ margin: "12px 0" }} />

      <div className={styles.footer}>
        <Button
          size="small"
          onClick={resetColumnsToDefault}
          className={styles.resetButton}
        >
          Reset to default
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      title="Columns"
      trigger="click"
      placement="bottomLeft"
    >
      <Button size="small" icon={<SettingOutlined />}>
        Columns
      </Button>
    </Popover>
  );
};
