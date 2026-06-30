"use client";

import { useEffect, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Input, Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { normalizeWarehouseCode } from "../../mappers";
import type { CreateWarehouseFormValues } from "./types";

const useStyles = createStyles(({ token }) => ({
  fieldGroup: {
    display: "flex",
    gap: 16,
    marginBottom: 16,
    "@media (max-width: 720px)": {
      flexDirection: "column",
    },
  },
  field: {
    flex: 1,
    minWidth: 0,
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
  help: {
    fontSize: 12,
    color: token.colorTextSecondary,
    marginTop: 6,
  },
}));

export function GeneralSection() {
  const { styles } = useStyles();
  const { control, watch, setValue } =
    useFormContext<CreateWarehouseFormValues>();
  const [isCodeManual, setIsCodeManual] = useState(false);
  const name = watch("name");

  useEffect(() => {
    if (!isCodeManual && name) {
      setValue("code", normalizeWarehouseCode(name), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [isCodeManual, name, setValue]);

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
                  data-testid="create-warehouse-name-input"
                  placeholder="Main fulfillment center"
                  status={error ? "error" : undefined}
                />
                {error && <div className={styles.error}>{error.message}</div>}
              </>
            )}
          />
        </div>

        <div className={styles.field}>
          <div className={styles.label}>
            Code
            <Tooltip title="Used in operations, imports, and stock reports.">
              <InfoCircleOutlined
                style={{ color: "var(--ant-color-text-secondary)" }}
              />
            </Tooltip>
          </div>
          <Controller
            name="code"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <>
                <Input
                  {...field}
                  data-testid="create-warehouse-code-input"
                  placeholder="MAIN-FULFILLMENT"
                  status={error ? "error" : undefined}
                  onChange={(event) => {
                    setIsCodeManual(true);
                    field.onChange(normalizeWarehouseCode(event.target.value));
                  }}
                />
                {error ? (
                  <div className={styles.error}>{error.message}</div>
                ) : (
                  <div className={styles.help}>
                    Code is used in operations, imports, and stock reports.
                  </div>
                )}
              </>
            )}
          />
        </div>
      </div>
    </Paper>
  );
}
