"use client";

import { Typography, Flex } from "antd";
import { createStyles } from "antd-style";
import { PERMISSION_PRESETS, detectPreset } from "../constants";
import type { FormPermission, IPermissionPreset } from "../types";

const useStyles = createStyles(({ token }) => ({
  container: {
    width: "100%",
  },
  presetGroup: {
    width: "100%",
    display: "flex",
    gap: token.marginSM,
  },
  presetCard: {
    flex: 1,
    padding: token.paddingMD,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    cursor: "pointer",
    transition: "all 0.2s",
    background: token.colorBgContainer,
    "&:hover": {
      borderColor: token.colorBorder,
    },
  },
  presetCardSelected: {
    borderColor: token.colorBorder,
    background: token.colorBgLayout,
  },
  presetCardDisabled: {
    cursor: "not-allowed",
    opacity: 0.5,
    "&:hover": {
      borderColor: token.colorBorderSecondary,
      background: token.colorBgContainer,
    },
  },
  presetHeader: {
    display: "flex",
    alignItems: "center",
    gap: token.marginXS,
    marginBottom: token.marginXS,
  },
  presetIcon: {
    fontSize: 18,
    color: token.colorPrimary,
  },
  presetLabel: {
    fontWeight: 600,
    fontSize: token.fontSize,
  },
  presetDescription: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    lineHeight: 1.4,
  },
  radioHidden: {
    position: "absolute",
    opacity: 0,
    pointerEvents: "none",
  },
}));

interface IPermissionPresetsProps {
  resources: string[];
  permissions: FormPermission[];
  onChange: (permissions: FormPermission[]) => void;
  disabled?: boolean;
}

export const PermissionPresets = ({
  resources,
  permissions,
  onChange,
  disabled = false,
}: IPermissionPresetsProps) => {
  const { styles, cx } = useStyles();

  const currentPreset = detectPreset(permissions);

  const handlePresetChange = (preset: IPermissionPreset) => {
    if (disabled || preset.id === "custom") return;
    const newPermissions = preset.getPermissions(resources);
    onChange(newPermissions);
  };

  // Only show viewer, editor, and admin presets (not custom)
  const displayPresets = PERMISSION_PRESETS.filter((p) => p.id !== "custom");

  return (
    <div className={styles.container}>
      <Flex vertical gap="small" style={{ width: "100%", marginBottom: 8 }}>
        <Typography.Text strong>Quick Setup</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Select a preset to quickly configure permissions, or customize below
        </Typography.Text>
      </Flex>
      <div className={styles.presetGroup}>
        {displayPresets.map((preset) => {
          const isSelected = currentPreset === preset.id;

          return (
            <div
              key={preset.id}
              className={cx(
                styles.presetCard,
                isSelected && styles.presetCardSelected,
                disabled && styles.presetCardDisabled
              )}
              onClick={() => handlePresetChange(preset)}
            >
              <div className={styles.presetHeader}>
                {preset.icon && (
                  <span className={styles.presetIcon}>{preset.icon}</span>
                )}
                <Typography.Text className={styles.presetLabel}>
                  {preset.label}
                </Typography.Text>
              </div>
              <Typography.Text className={styles.presetDescription}>
                {preset.description}
              </Typography.Text>
            </div>
          );
        })}
      </div>
      {currentPreset === "custom" && (
        <Typography.Text
          type="secondary"
          style={{ display: "block", marginTop: 8, fontSize: 12 }}
        >
          Custom permissions configured - adjust individual settings below
        </Typography.Text>
      )}
    </div>
  );
};
