import React from "react";
import { createStyles } from "antd-style";
import { Popover, Checkbox, Divider, Typography, Button } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { useBulkEditorStore } from "../hooks/useBulkEditorStore";
import {
  PRODUCT_COLUMNS,
  PRICING_COLUMNS,
  INVENTORY_COLUMNS,
  ATTRIBUTES_COLUMNS,
} from "../types";

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
}));

export const ColumnSettingsPopover: React.FC = () => {
  const { styles } = useStyles();
  const columnVisibility = useBulkEditorStore((s) => s.columnVisibility);
  const toggleColumn = useBulkEditorStore((s) => s.toggleColumn);

  const sections = [
    { title: "General", columns: PRODUCT_COLUMNS },
    { title: "Pricing", columns: PRICING_COLUMNS },
    { title: "Inventory", columns: INVENTORY_COLUMNS },
    { title: "Attributes", columns: ATTRIBUTES_COLUMNS },
  ];

  const content = (
    <div className={styles.content}>
      {sections.map((section, index) => (
        <React.Fragment key={section.title}>
          {index > 0 && <Divider style={{ margin: "12px 0" }} />}
          <div className={styles.section}>
            <Text className={styles.sectionTitle}>{section.title}</Text>
            <div className={styles.checkboxGroup}>
              {section.title === "General" && (
                <Checkbox checked disabled className={styles.checkbox}>
                  Title
                </Checkbox>
              )}
              {section.columns.map((col) => (
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
      ))}
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
