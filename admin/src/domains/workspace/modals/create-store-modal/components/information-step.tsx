"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Typography, Input } from "antd";
import { useStyles } from "../create-store-modal.styles";
import type { ICreateStoreFormValues } from "../types";

export function InformationStep() {
  const { styles } = useStyles();
  const {
    control,
    formState: { errors },
  } = useFormContext<ICreateStoreFormValues>();

  return (
    <div className={styles.formContainer}>
      <Typography.Title level={4} className={styles.title}>
        Name your store
      </Typography.Title>

      <div className={styles.formItem}>
        <label className={styles.label}>
          Store Name
          <span className={styles.required}>*</span>
        </label>
        <Controller
          name="name"
          control={control}
          rules={{
            required: "Store name is required",
            minLength: {
              value: 2,
              message: "Store name must be at least 2 characters",
            },
          }}
          render={({ field }) => (
            <Input
              {...field}
              size="large"
              placeholder="Enter your store name"
              status={errors.name ? "error" : undefined}
            />
          )}
        />
        {errors.name && (
          <div className={styles.error}>{errors.name.message}</div>
        )}
        <div className={styles.helper}>
          This will be displayed to your customers
        </div>
      </div>
    </div>
  );
}
