"use client";

import { useCallback } from "react";
import { createStyles } from "antd-style";
import { Input, InputNumber, Checkbox, Select, Typography } from "antd";
import type { IComponentGroup } from "../types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    paddingBottom: 16,
    marginBottom: 16,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  fieldFull: {
    gridColumn: "1 / -1",
  },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: token.colorTextSecondary,
    fontWeight: 500,
  },
  checkboxRow: {
    display: "flex",
    gap: 24,
    alignItems: "center",
    gridColumn: "1 / -1",
  },
  selectionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
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
  const { styles, cx } = useStyles();

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

  const handleSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ slug: e.target.value });
    },
    [onChange]
  );

  const defaultItemOptions = group.items.map((item) => ({
    value: item.id,
    label: item.customTitle || `Item ${item.sortIndex + 1}`,
  }));

  return (
    <div className={styles.container}>
      {/* Title */}
      <div className={styles.field}>
        <Typography.Text className={styles.label}>Name</Typography.Text>
        <Input
          value={group.title}
          onChange={handleTitleChange}
          placeholder="Group name"
        />
      </div>

      {/* Slug */}
      <div className={styles.field}>
        <Typography.Text className={styles.label}>Slug</Typography.Text>
        <Input
          value={group.slug}
          onChange={handleSlugChange}
          placeholder="group-slug"
        />
      </div>

      {/* Checkboxes */}
      <div className={styles.checkboxRow}>
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
          Multiple selection
        </Checkbox>
      </div>

      {/* Min/Max Selection */}
      <div className={styles.field}>
        <Typography.Text className={styles.label}>Min selection</Typography.Text>
        <InputNumber
          value={group.minSelection}
          min={0}
          max={group.maxSelection ?? undefined}
          onChange={(value) => onChange({ minSelection: value ?? 0 })}
          style={{ width: "100%" }}
        />
      </div>

      <div className={styles.field}>
        <Typography.Text className={styles.label}>Max selection</Typography.Text>
        <InputNumber
          value={group.maxSelection ?? undefined}
          min={group.minSelection}
          placeholder="Unlimited"
          onChange={(value) => onChange({ maxSelection: value })}
          style={{ width: "100%" }}
          disabled={!group.isMultiple}
        />
      </div>

      {/* Default Items */}
      <div className={cx(styles.field, styles.fieldFull)}>
        <Typography.Text className={styles.label}>Default selected</Typography.Text>
        <Select
          mode={group.isMultiple ? "multiple" : undefined}
          value={group.defaultItemIds}
          onChange={(value) =>
            onChange({
              defaultItemIds: Array.isArray(value) ? value : value ? [value] : [],
            })
          }
          options={defaultItemOptions}
          placeholder="Select default items"
          allowClear
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
};

export default GroupSettings;
