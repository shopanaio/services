"use client";

import { useCallback } from "react";
import { createStyles } from "antd-style";
import { Input, InputNumber, Checkbox, Select, Flex } from "antd";
import type { IComponentGroup } from "../types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    paddingBottom: 16,
    marginBottom: 16,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  row: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  nameInput: {
    width: 200,
  },
  numberInput: {
    width: 80,
  },
  defaultSelect: {
    flex: 1,
    minWidth: 200,
  },
  label: {
    fontSize: 12,
    color: token.colorTextSecondary,
    whiteSpace: "nowrap",
  },
}));

// ============================================================================
// Props
// ============================================================================

interface IGroupSettingsProps {
  group: IComponentGroup;
  onChange: (updates: Partial<IComponentGroup>) => void;
}

// ============================================================================
// Component
// ============================================================================

export const GroupSettings = ({ group, onChange }: IGroupSettingsProps) => {
  const { styles } = useStyles();

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const title = e.target.value;
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      onChange({ title, slug });
    },
    [onChange]
  );

  const defaultItemOptions = group.items.map((item) => ({
    value: item.id,
    label: item.customTitle || `Item ${item.sortIndex + 1}`,
  }));

  return (
    <div className={styles.container}>
      {/* Row 1: Name, Checkboxes, Min/Max */}
      <Flex gap={16} align="center" wrap="wrap">
        <Input
          value={group.title}
          onChange={handleTitleChange}
          placeholder="Group name"
          className={styles.nameInput}
        />

        <Checkbox
          checked={group.isRequired}
          onChange={(e) => onChange({ isRequired: e.target.checked })}
        >
          Required
        </Checkbox>

        <Checkbox
          checked={group.isMultiple}
          onChange={(e) => {
            const isMultiple = e.target.checked;
            onChange({
              isMultiple,
              maxSelection: isMultiple ? group.maxSelection : 1,
            });
          }}
        >
          Multiple
        </Checkbox>

        <Flex gap={8} align="center">
          <span className={styles.label}>Min</span>
          <InputNumber
            value={group.minSelection}
            min={0}
            max={group.maxSelection ?? undefined}
            onChange={(value) => onChange({ minSelection: value ?? 0 })}
            className={styles.numberInput}
            size="small"
          />
        </Flex>

        <Flex gap={8} align="center">
          <span className={styles.label}>Max</span>
          <InputNumber
            value={group.maxSelection ?? undefined}
            min={group.minSelection}
            placeholder="∞"
            onChange={(value) => onChange({ maxSelection: value })}
            className={styles.numberInput}
            size="small"
            disabled={!group.isMultiple}
          />
        </Flex>

        <Flex gap={8} align="center" flex={1}>
          <span className={styles.label}>Default</span>
          <Select
            mode={group.isMultiple ? "multiple" : undefined}
            value={group.defaultItemIds}
            onChange={(value) =>
              onChange({
                defaultItemIds: Array.isArray(value) ? value : value ? [value] : [],
              })
            }
            options={defaultItemOptions}
            placeholder="Select default"
            allowClear
            className={styles.defaultSelect}
            size="small"
          />
        </Flex>
      </Flex>
    </div>
  );
};

export default GroupSettings;
