import React from "react";
import { createStyles } from "antd-style";
import { Popover, Checkbox, Button, Divider, Typography } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { useBulkEditorStore } from "../hooks/useBulkEditorStore";
import { PRODUCT_COLUMNS, VARIANT_COLUMNS } from "../types";

const { Text } = Typography;

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

export const ColumnSettingsPopover: React.FC = () => {
  const { styles } = useStyles();
  const columnVisibility = useBulkEditorStore((s) => s.columnVisibility);
  const toggleColumn = useBulkEditorStore((s) => s.toggleColumn);
  const resetColumnsToDefault = useBulkEditorStore((s) => s.resetColumnsToDefault);

  const content = (
    <div className={styles.content}>
      <div className={styles.section}>
        <Text className={styles.sectionTitle}>Product</Text>
        <div className={styles.checkboxGroup}>
          {PRODUCT_COLUMNS.map((col) => (
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
      <Button size="small" icon={<SettingOutlined />}>Columns</Button>
    </Popover>
  );
};
