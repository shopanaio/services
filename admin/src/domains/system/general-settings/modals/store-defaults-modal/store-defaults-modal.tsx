"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, App, Select, Typography } from "antd";
import { createStyles } from "antd-style";
import { UnitSystem, WeightUnit } from "@/graphql/types";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { useUpdateGeneralSettings } from "../../hooks";
import { mapStoreDefaultsInput } from "../../mappers";
import type { EditStoreDefaultsModalPayload } from "../../modals";
import type { StoreDefaultsFormValues } from "../../types";
import {
  getTimeZoneOptions,
  UNIT_SYSTEM_LABELS,
  WEIGHT_UNIT_LABELS,
} from "../../utils";

const useStyles = createStyles(({ token }) => ({
  intro: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: 600,
    lineHeight: "28px",
  },
  introCopy: {
    color: token.colorTextSecondary,
    fontSize: 13,
    lineHeight: "20px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    width: "100%",
  },
  paper: {
    padding: 0,
    overflow: "hidden",
  },
  paperHeader: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    height: 42,
    padding: "9px 16px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  paperTitle: {
    lineHeight: "22px",
  },
  paperBody: {
    padding: "14px 16px 16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
    "@media (max-width: 680px)": {
      gridTemplateColumns: "1fr",
    },
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    minWidth: 0,
  },
  label: {
    color: token.colorTextSecondary,
    fontSize: 13,
    lineHeight: "20px",
  },
  hint: {
    color: token.colorTextTertiary,
    fontSize: 12,
    lineHeight: "18px",
  },
}));

interface FormPaperProps {
  children: React.ReactNode;
  title: string;
}

const FormPaper = ({ children, title }: FormPaperProps) => {
  const { styles } = useStyles();

  return (
    <Paper className={styles.paper}>
      <div className={styles.paperHeader}>
        <Typography.Text strong className={styles.paperTitle}>
          {title}
        </Typography.Text>
      </div>
      <div className={styles.paperBody}>{children}</div>
    </Paper>
  );
};

const unitSystemOptions = Object.values(UnitSystem).map((value) => ({
  label: UNIT_SYSTEM_LABELS[value],
  value,
}));

const weightUnitOptions = Object.values(WeightUnit).map((value) => ({
  label: WEIGHT_UNIT_LABELS[value],
  value,
}));

export const StoreDefaultsModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as EditStoreDefaultsModalPayload;
  const { store } = typedPayload;
  const updateMutation = useUpdateGeneralSettings();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const timeZoneOptions = useMemo(() => getTimeZoneOptions(), []);
  const {
    control,
    handleSubmit,
    formState: { isDirty },
  } = useForm<StoreDefaultsFormValues>({
    defaultValues: {
      unitSystem: store.defaults.unitSystem,
      defaultWeightUnit: store.defaults.defaultWeightUnit,
      timezone: store.defaults.timezone,
    },
  });

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    const result = await updateMutation.updateStore({
      storeId: store.id,
      expectedRevision: store.revision,
      operations: mapStoreDefaultsInput(values, store),
    });
    const operationErrors = result.operationResults.flatMap(
      ({ applied, errors }) => (applied ? [] : errors),
    );
    const mutationErrors = [...result.userErrors, ...operationErrors];

    if (!result.data || mutationErrors.length > 0) {
      setSubmitError(
        [...new Set(mutationErrors.map(({ message: errorMessage }) => errorMessage))]
          .join("\n") ||
          updateMutation.error?.message ||
          "The store defaults could not be saved.",
      );
      return;
    }

    await typedPayload.onSaved?.();
    message.success("Store defaults updated");
    forcePop();
  });

  return (
    <ModalLayout
      name="store-defaults"
      header={
        <ModalHeader
          name="store-defaults"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            disabled: !isDirty,
            loading: updateMutation.loading,
            onClick: submit,
          }}
          title="Edit Store Defaults"
        />
      }
    >
      <div className={styles.intro}>
        <Typography.Text className={styles.introTitle}>Store defaults</Typography.Text>
        <Typography.Text className={styles.introCopy}>
          Set the regional and measurement defaults used across your store.
        </Typography.Text>
      </div>
      {submitError ? <Alert message={submitError} showIcon type="error" /> : null}
      <form className={styles.form} onSubmit={submit}>
        <FormPaper title="Measurement defaults">
          <div className={styles.grid}>
            <div className={styles.field}>
              <Typography.Text className={styles.label}>Unit system</Typography.Text>
              <Controller
                control={control}
                name="unitSystem"
                render={({ field }) => (
                  <Select
                    {...field}
                    options={unitSystemOptions}
                    placeholder="Select unit system"
                  />
                )}
              />
            </div>
            <div className={styles.field}>
              <Typography.Text className={styles.label}>
                Default weight unit
              </Typography.Text>
              <Controller
                control={control}
                name="defaultWeightUnit"
                render={({ field }) => (
                  <Select
                    {...field}
                    options={weightUnitOptions}
                    placeholder="Select default weight unit"
                  />
                )}
              />
            </div>
          </div>
        </FormPaper>
        <FormPaper title="Regional defaults">
          <div className={styles.field}>
            <Typography.Text className={styles.label}>Time zone</Typography.Text>
            <Controller
              control={control}
              name="timezone"
              render={({ field }) => (
                <Select
                  {...field}
                  optionFilterProp="label"
                  options={timeZoneOptions}
                  placeholder="Select time zone"
                  showSearch
                />
              )}
            />
            <span className={styles.hint}>
              Sets the time used for orders and analytics.
            </span>
          </div>
        </FormPaper>
      </form>
    </ModalLayout>
  );
};
