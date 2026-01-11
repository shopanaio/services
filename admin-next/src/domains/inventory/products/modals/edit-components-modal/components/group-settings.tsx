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
          checked={group.rules.isRequired}
          onChange={(e) =>
            onChange({
              rules: { ...group.rules, isRequired: e.target.checked },
            })
          }
        >
          Required
        </Checkbox>

        <Checkbox
          checked={group.rules.isMultiple}
          onChange={(e) => {
            const isMultiple = e.target.checked;
            onChange({
              rules: {
                ...group.rules,
                isMultiple,
                maxSelection: isMultiple ? group.rules.maxSelection : 1,
              },
            });
          }}
        >
          Multiple
        </Checkbox>

        <Flex gap={8} align="center">
          <span className={styles.label}>Min</span>
          <InputNumber
            value={group.rules.minSelection ?? 0}
            min={0}
            max={group.rules.maxSelection ?? undefined}
            onChange={(value) =>
              onChange({
                rules: {
                  ...group.rules,
                  minSelection: typeof value === "number" ? value : null,
                },
              })
            }
            className={styles.numberInput}
            size="small"
          />
        </Flex>

        <Flex gap={8} align="center">
          <span className={styles.label}>Max</span>
          <InputNumber
            value={group.rules.maxSelection ?? undefined}
            min={group.rules.minSelection ?? 0}
            placeholder="∞"
            onChange={(value) =>
              onChange({
                rules: {
                  ...group.rules,
                  maxSelection: typeof value === "number" ? value : null,
                },
              })
            }
            className={styles.numberInput}
            size="small"
            disabled={!group.rules.isMultiple}
          />
        </Flex>
      </Flex>
    </Flex>
  );
};

export default GroupSettings;
