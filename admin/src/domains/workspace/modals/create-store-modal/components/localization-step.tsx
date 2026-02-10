"use client";

import { useCallback, useRef } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Typography, Select, Tag } from "antd";
import type { CustomTagProps, BaseSelectRef } from "@rc-component/select/lib/BaseSelect";
import { useStyles } from "../create-store-modal.styles";
import type { ICreateStoreFormValues } from "../types";
import {
  shopCountries,
  allowedCountries,
  currencies,
  allowedCurrencies,
  shopLocales,
  allowedLocales,
} from "@/defs/localization";

export function LocalizationStep() {
  const { styles } = useStyles();
  const selectRef = useRef<BaseSelectRef>(null);
  const {
    control,
    getValues,
    formState: { errors },
  } = useFormContext<ICreateStoreFormValues>();

  const handleChange = useCallback(() => {
    selectRef.current?.blur();
  }, []);

  const tagRender = (props: CustomTagProps) => {
    const selectedItems = getValues("locales") || [];
    const isFirst = selectedItems[0] === props.value;

    return (
      <Tag
        {...props}
        bordered
        color={isFirst ? "blue" : undefined}
        className={styles.localeTag}
      >
        <Typography.Text strong={isFirst}>{props.label}</Typography.Text>
      </Tag>
    );
  };

  const countryOptions = shopCountries
    .filter((c) => allowedCountries.includes(c.value))
    .map((c) => ({ value: c.value, label: c.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const currencyOptions = currencies
    .filter((c) => allowedCurrencies.includes(c.value))
    .map((c) => ({ value: c.value, label: c.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const localeOptions = shopLocales
    .filter((l) => allowedLocales.includes(l.value))
    .map((l) => ({ value: l.value, label: l.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className={styles.formContainer}>
      <Typography.Title level={4} className={styles.title}>
        Configure localization
      </Typography.Title>

      <div className={styles.formItem}>
        <label className={styles.label}>
          Country
          <span className={styles.required}>*</span>
        </label>
        <Controller
          name="country"
          control={control}
          rules={{ required: "Country is required" }}
          render={({ field }) => (
            <Select
              {...field}
              size="large"
              showSearch
              style={{ width: "100%" }}
              placeholder="Select country"
              options={countryOptions}
              status={errors.country ? "error" : undefined}
            />
          )}
        />
        {errors.country && (
          <div className={styles.error}>{errors.country.message}</div>
        )}
      </div>

      <div className={styles.formItem}>
        <label className={styles.label}>
          Languages
          <span className={styles.required}>*</span>
        </label>
        <Controller
          name="locales"
          control={control}
          rules={{ required: "At least one language is required" }}
          render={({ field }) => (
            <Select
              {...field}
              ref={selectRef}
              mode="multiple"
              size="large"
              showSearch
              style={{ width: "100%" }}
              placeholder="Select languages"
              options={localeOptions}
              status={errors.locales ? "error" : undefined}
              tagRender={tagRender}
              onChange={(value) => {
                handleChange();
                field.onChange(value);
              }}
            />
          )}
        />
        {errors.locales && (
          <div className={styles.error}>{errors.locales.message}</div>
        )}
        <div className={styles.helper}>
          First language will be the default. Drag to reorder.
        </div>
      </div>

      <div className={styles.formItem}>
        <label className={styles.label}>
          Currency
          <span className={styles.required}>*</span>
        </label>
        <Controller
          name="currency"
          control={control}
          rules={{ required: "Currency is required" }}
          render={({ field }) => (
            <Select
              {...field}
              size="large"
              showSearch
              style={{ width: "100%" }}
              placeholder="Select currency"
              options={currencyOptions}
              status={errors.currency ? "error" : undefined}
            />
          )}
        />
        {errors.currency && (
          <div className={styles.error}>{errors.currency.message}</div>
        )}
      </div>
    </div>
  );
}
