"use client";

import { useState, useEffect } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Input, Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { slugify } from "transliteration/dist/node/src/node/index.js";
import { Paper } from "../../components/paper";
import { PaperHeader } from "../../components/paper-header";
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
  error: {
    fontSize: 12,
    color: token.colorError,
    marginTop: 4,
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
            render={({ field, fieldState: { error } }) => (
              <>
                <Input
                  {...field}
                  placeholder="e.g. Winter Jacket"
                  status={error ? "error" : undefined}
                />
                {error && <div className={styles.error}>{error.message}</div>}
              </>
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
            render={({ field, fieldState: { error } }) => (
              <>
                <Input
                  {...field}
                  placeholder="winter-jacket"
                  status={error ? "error" : undefined}
                  onChange={(e) => {
                    const value = slugify(e.target.value);
                    setIsHandleManual(true);
                    field.onChange(value);
                  }}
                  addonBefore={<span className={styles.handlePrefix}>/</span>}
                />
                {error && <div className={styles.error}>{error.message}</div>}
              </>
            )}
          />
        </div>
      </div>

      <div className={styles.field}>
        <div className={styles.label}>Description</div>
        <Controller
          name="description"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <>
              <Input.TextArea
                {...field}
                placeholder="Describe your product..."
                rows={3}
                style={{ resize: "vertical" }}
                status={error ? "error" : undefined}
              />
              {error && <div className={styles.error}>{error.message}</div>}
            </>
          )}
        />
      </div>
    </Paper>
  );
};
