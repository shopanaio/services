"use client";

import { useState, useEffect, useRef } from "react";
import { Input, Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { Paper } from "../../components/Paper";
import { PaperHeader } from "../../components/PaperHeader";
import { toKebabCase } from "./utils/generateVariants";
import type { ISectionProps } from "./types";

const useStyles = createStyles(({ token }) => ({
  fieldGroup: {
    display: "flex",
    gap: 16,
    marginBottom: 16,
    "&:last-child": {
      marginBottom: 0,
    },
  },
  field: {
    flex: 1,
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
    fontSize: 13,
    fontWeight: 500,
    color: token.colorText,
  },
  handlePrefix: {
    color: token.colorTextSecondary,
    userSelect: "none",
  },
}));

export const GeneralSection = ({
  formState,
  updateFormState,
}: ISectionProps) => {
  const { styles } = useStyles();
  const [isHandleManual, setIsHandleManual] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate handle from title (unless manually edited)
  useEffect(() => {
    if (!isHandleManual && formState.title) {
      updateFormState("handle", toKebabCase(formState.title));
    }
  }, [formState.title, isHandleManual, updateFormState]);

  // Focus title input on mount
  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormState("title", e.target.value);
  };

  const handleHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = toKebabCase(e.target.value);
    setIsHandleManual(true);
    updateFormState("handle", value);
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    updateFormState("description", e.target.value);
  };

  return (
    <Paper>
      <PaperHeader title="General" />

      <div className={styles.fieldGroup}>
        <div className={styles.field}>
          <div className={styles.label}>Title</div>
          <Input
            ref={(input) => {
              if (input) {
                titleInputRef.current = input.input ?? null;
              }
            }}
            placeholder="e.g. Winter Jacket"
            value={formState.title}
            onChange={handleTitleChange}
          />
        </div>

        <div className={styles.field}>
          <div className={styles.label}>
            Handle
            <Tooltip title="URL-friendly identifier. Auto-generated from title if left empty.">
              <InfoCircleOutlined
                style={{ color: "var(--ant-color-text-secondary)" }}
              />
            </Tooltip>
          </div>
          <Input
            placeholder="winter-jacket"
            value={formState.handle}
            onChange={handleHandleChange}
            addonBefore={<span className={styles.handlePrefix}>/</span>}
          />
        </div>
      </div>

      <div className={styles.field}>
        <div className={styles.label}>Description</div>
        <Input.TextArea
          placeholder="Describe your product..."
          value={formState.description}
          onChange={handleDescriptionChange}
          rows={3}
          style={{ resize: "vertical" }}
        />
      </div>
    </Paper>
  );
};
