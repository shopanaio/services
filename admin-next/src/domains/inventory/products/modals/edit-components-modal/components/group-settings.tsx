"use client";

import { useCallback } from "react";
import { createStyles } from "antd-style";
import { Input, InputNumber, Checkbox, Flex } from "antd";
import type { IComponentGroup } from "../types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  container: {
    paddingBlock: token.padding,
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
      onChange({ title: e.target.value });
    },
    [onChange]
  );

  return (
    <Flex gap={12} className={styles.container}>
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
      </Flex>
    </Flex>
  );
};

export default GroupSettings;
