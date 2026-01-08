"use client";

import { useState, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Input, Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { slugify } from "transliteration";
import { Paper } from "../../components/Paper";
import { PaperHeader } from "../../components/PaperHeader";
import type { ICreateProductFormValues } from "./types";

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

export const GeneralSection = () => {
  const { styles } = useStyles();
  const { control, watch, setValue } = useFormContext<ICreateProductFormValues>();
  const [isHandleManual, setIsHandleManual] = useState(false);

  const title = watch("title");

  // Auto-generate handle from title (unless manually edited)
  useEffect(() => {
    if (!isHandleManual && title) {
      setValue("handle", slugify(title));
    }
  }, [title, isHandleManual, setValue]);

  return (
    <Paper>
      <PaperHeader title="General" />

      <div className={styles.fieldGroup}>
        <div className={styles.field}>
          <div className={styles.label}>Title</div>
          <Controller
            name="title"
            control={control}
            rules={{ required: "Product title is required" }}
            render={({ field }) => (
              <Input {...field} placeholder="e.g. Winter Jacket" />
            )}
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
          <Controller
            name="handle"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="winter-jacket"
                onChange={(e) => {
                  const value = slugify(e.target.value);
                  setIsHandleManual(true);
                  field.onChange(value);
                }}
                addonBefore={<span className={styles.handlePrefix}>/</span>}
              />
            )}
          />
        </div>
      </div>

      <div className={styles.field}>
        <div className={styles.label}>Description</div>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Input.TextArea
              {...field}
              placeholder="Describe your product..."
              rows={3}
              style={{ resize: "vertical" }}
            />
          )}
        />
      </div>
    </Paper>
  );
};
