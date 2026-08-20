"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert, App, InputNumber, Select, Typography } from "antd";
import { createStyles } from "antd-style";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { useUpdateGeneralSettings } from "../../hooks";
import { mapStoreCurrencyInput } from "../../mappers";
import type { EditStoreCurrencyModalPayload } from "../../modals";
import type { StoreCurrencyFormValues } from "../../types";
import {
  CURRENCY_DISPLAY_LABELS,
  CURRENCY_GROUPING_LABELS,
  CURRENCY_ROUNDING_MODE_LABELS,
  CURRENCY_SIGN_DISPLAY_LABELS,
  CURRENCY_SIGN_LABELS,
  CURRENCY_TRAILING_ZERO_LABELS,
  formatCurrencyPreview,
  getCurrencyOptions,
  toIntlOptionValue,
} from "../../utils";

const useStyles = createStyles(({ token }) => ({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    width: "100%",
  },
  paper: { padding: 0, overflow: "hidden" },
  paperHeader: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    height: 50,
    padding: "5px 16px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  paperTitle: { fontSize: 18, fontWeight: 600, lineHeight: "24px" },
  selectionBody: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: "18px 20px",
  },
  formattingBody: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: "18px 20px",
  },
  description: { color: token.colorTextSecondary, fontSize: 13, lineHeight: "19px" },
  code: {
    display: "flex",
    alignItems: "center",
    height: 44,
    padding: "0 10px",
    overflow: "hidden",
    color: token.colorPrimary,
    fontFamily: token.fontFamilyCode,
    fontSize: 12,
    lineHeight: "18px",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    background: token.colorPrimaryBg,
    borderRadius: token.borderRadius,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "14px 24px",
    "@media (max-width: 680px)": { gridTemplateColumns: "1fr" },
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
  },
  label: { fontSize: 13, fontWeight: 600, lineHeight: "19px" },
  help: { color: token.colorTextSecondary, fontSize: 11, lineHeight: "17px" },
  control: { width: "100%" },
  error: { color: token.colorError, fontSize: 11, lineHeight: "17px" },
  preview: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 60,
    padding: "10px 12px",
    background: token.colorFillQuaternary,
    borderRadius: token.borderRadius,
    "@media (max-width: 680px)": {
      alignItems: "flex-start",
      flexDirection: "column",
      gap: 8,
    },
  },
  previewCopy: { display: "flex", flexDirection: "column", gap: 1 },
  previewLabel: {
    color: token.colorTextSecondary,
    fontSize: 11,
    fontWeight: 600,
    lineHeight: "17px",
  },
  previewValue: { fontSize: 15, fontWeight: 600, lineHeight: "21px" },
  resolved: { color: token.colorTextSecondary, fontSize: 12, lineHeight: "18px" },
}));

interface FormPaperProps {
  children: React.ReactNode;
  title: string;
  bodyClassName: string;
}

const FormPaper = ({ children, title, bodyClassName }: FormPaperProps) => {
  const { styles } = useStyles();
  return (
    <Paper className={styles.paper}>
      <div className={styles.paperHeader}>
        <Typography.Text className={styles.paperTitle}>{title}</Typography.Text>
      </div>
      <div className={bodyClassName}>{children}</div>
    </Paper>
  );
};

const optionsFromLabels = <T extends string>(labels: Record<T, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value: value as T, label }));

export const StoreCurrencyModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as EditStoreCurrencyModalPayload;
  const { store } = typedPayload;
  const updateMutation = useUpdateGeneralSettings();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const currencyOptions = useMemo(() => getCurrencyOptions(), []);
  const {
    control,
    getValues,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<StoreCurrencyFormValues>({ defaultValues: store.currencySettings });
  const values = useWatch({ control }) as StoreCurrencyFormValues;
  const displayValue = toIntlOptionValue(values.currencyDisplay);
  const intlExample = `Intl.NumberFormat(undefined, { style: "currency", currency: "${values.currencyCode}", ...options })`;

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const submit = handleSubmit(async (formValues) => {
    setSubmitError(null);
    const result = await updateMutation.updateStore({
      storeId: store.id,
      expectedRevision: store.revision,
      operations: mapStoreCurrencyInput(formValues),
    });
    const operationErrors = result.operationResults.flatMap(
      ({ applied, errors: operationErrorList }) => (applied ? [] : operationErrorList),
    );
    const mutationErrors = [...result.userErrors, ...operationErrors];

    if (!result.data || mutationErrors.length > 0) {
      setSubmitError(
        [...new Set(mutationErrors.map(({ message: errorMessage }) => errorMessage))].join("\n") ||
          updateMutation.error?.message ||
          "The currency settings could not be saved.",
      );
      return;
    }

    await typedPayload.onSaved?.();
    message.success("Currency settings updated");
    forcePop();
  });

  const selectField = <T extends keyof StoreCurrencyFormValues>(
    name: T,
    label: string,
    options: Array<{ value: StoreCurrencyFormValues[T]; label: string }>,
  ) => (
    <div className={styles.field}>
      <Typography.Text className={styles.label}>{label}</Typography.Text>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            {...field}
            className={styles.control}
            optionFilterProp="label"
            options={options}
            placeholder={`Select ${label.toLowerCase()}`}
            showSearch={options.length > 10}
          />
        )}
      />
    </div>
  );

  const numberField = (name: "minimumFractionDigits" | "maximumFractionDigits", label: string) => (
    <div className={styles.field}>
      <Typography.Text className={styles.label}>{label}</Typography.Text>
      <Controller
        control={control}
        name={name}
        rules={{
          min: { value: 0, message: "Must be 0 or greater" },
          max: { value: 100, message: "Must be 100 or less" },
          validate: (value) =>
            name === "minimumFractionDigits"
              ? value <= getValues("maximumFractionDigits") || "Must not exceed maximum"
              : value >= getValues("minimumFractionDigits") || "Must not be below minimum",
        }}
        render={({ field }) => (
          <InputNumber
            className={styles.control}
            max={100}
            min={0}
            onBlur={field.onBlur}
            onChange={(value) => field.onChange(value ?? 0)}
            placeholder={`Enter ${label.toLowerCase()}`}
            value={field.value}
          />
        )}
      />
      {errors[name] ? <span className={styles.error}>{errors[name]?.message}</span> : null}
    </div>
  );

  return (
    <ModalLayout
      name="store-currency"
      header={
        <ModalHeader
          name="store-currency"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            disabled: !isDirty,
            loading: updateMutation.loading,
            onClick: submit,
          }}
          title="Edit currency"
        />
      }
    >
      {submitError ? <Alert message={submitError} showIcon type="error" /> : null}
      <form className={styles.form} onSubmit={submit}>
        <FormPaper bodyClassName={styles.selectionBody} title="Currency">
          <div className={styles.field}>
            <Typography.Text className={styles.label}>Store currency</Typography.Text>
            <Controller
              control={control}
              name="currencyCode"
              render={({ field }) => (
                <Select
                  {...field}
                  className={styles.control}
                  optionFilterProp="label"
                  options={currencyOptions}
                  placeholder="Select store currency"
                  showSearch
                />
              )}
            />
            <span className={styles.help}>
              Used for all monetary values. Existing amounts are not converted.
            </span>
          </div>
        </FormPaper>

        <FormPaper bodyClassName={styles.formattingBody} title="Currency formatting">
          <Typography.Text className={styles.description}>
            Configure the Intl.NumberFormat options used across the storefront and notifications.
          </Typography.Text>
          <code className={styles.code}>{intlExample}</code>
          <div className={styles.grid}>
            {selectField(
              "currencyDisplay",
              "Currency display",
              optionsFromLabels(CURRENCY_DISPLAY_LABELS),
            )}
            {selectField("currencySign", "Currency sign", optionsFromLabels(CURRENCY_SIGN_LABELS))}
            {selectField("grouping", "Grouping", optionsFromLabels(CURRENCY_GROUPING_LABELS))}
            {selectField(
              "signDisplay",
              "Sign display",
              optionsFromLabels(CURRENCY_SIGN_DISPLAY_LABELS),
            )}
            {numberField("minimumFractionDigits", "Minimum fraction digits")}
            {numberField("maximumFractionDigits", "Maximum fraction digits")}
            {selectField(
              "roundingMode",
              "Rounding mode",
              optionsFromLabels(CURRENCY_ROUNDING_MODE_LABELS),
            )}
            {selectField(
              "trailingZeroDisplay",
              "Trailing zero display",
              optionsFromLabels(CURRENCY_TRAILING_ZERO_LABELS),
            )}
          </div>
          <div className={styles.preview}>
            <div className={styles.previewCopy}>
              <span className={styles.previewLabel}>Preview</span>
              <span className={styles.previewValue}>{formatCurrencyPreview(values)}</span>
            </div>
            <span className={styles.resolved}>
              {displayValue} · {values.maximumFractionDigits} fraction digits
            </span>
          </div>
        </FormPaper>
      </form>
    </ModalLayout>
  );
};
