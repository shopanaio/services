"use client";

import { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Input, Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { slugify } from "transliteration/dist/node/src/node/index.js";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { Editor } from "@/ui-kit/editor";
import type { ICreateCategoryFormValues } from "./types";

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
  const { control, watch, setValue } =
    useFormContext<ICreateCategoryFormValues>();
  const [isHandleManual, setIsHandleManual] = useState(false);

  const name = watch("name");

  useEffect(() => {
    if (!isHandleManual && name) {
      setValue("handle", slugify(name));
    }
  }, [name, isHandleManual, setValue]);

  return (
    <Paper>
      <PaperHeader title="General" />

      <div className={styles.fieldGroup}>
        <div className={styles.field}>
          <div className={styles.label}>Name</div>
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <>
                <Input
                  {...field}
                  data-testid="create-category-name-input"
                  placeholder="e.g. Summer essentials"
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
            <Tooltip title="URL-friendly identifier. Auto-generated from name if left empty.">
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
                  data-testid="create-category-handle-input"
                  placeholder="summer-essentials"
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
              <div data-testid="create-category-description-editor">
                <Editor
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Describe your category..."
                  minHeight={100}
                />
              </div>
              {error && <div className={styles.error}>{error.message}</div>}
            </>
          )}
        />
      </div>
    </Paper>
  );
};
