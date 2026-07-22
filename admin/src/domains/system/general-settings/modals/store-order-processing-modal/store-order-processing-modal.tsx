"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Alert, App, Checkbox, Input, Radio, Typography } from "antd";
import { createStyles } from "antd-style";
import { AutomaticFulfillmentMode } from "@/graphql/types";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { useUpdateGeneralSettings } from "../../hooks";
import { mapStoreOrderProcessingInput } from "../../mappers";
import type { EditStoreOrderProcessingModalPayload } from "../../modals";
import type { StoreOrderProcessingFormValues } from "../../types";

const useStyles = createStyles(({ token }) => ({
  intro: { display: "flex", flexDirection: "column", gap: 2 },
  introTitle: { fontSize: 18, fontWeight: 600, lineHeight: "24px" },
  introCopy: { color: token.colorTextSecondary, fontSize: 13, lineHeight: "20px" },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  paper: { padding: 0, overflow: "hidden" },
  paperHeader: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 50,
    padding: "5px 16px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  paperBody: { display: "flex", flexDirection: "column", gap: 14, padding: "14px 20px 18px" },
  inputGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, "@media (max-width: 680px)": { gridTemplateColumns: "1fr" } },
  field: { display: "flex", flexDirection: "column", gap: 3, minWidth: 0 },
  fieldLabel: { fontSize: 12, lineHeight: "18px" },
  preview: { display: "flex", alignItems: "center", gap: 14, minHeight: 42, padding: "8px 12px", background: token.colorFillQuaternary, borderRadius: token.borderRadiusSM },
  previewLabel: { color: token.colorTextSecondary, fontSize: 12 },
  previewValue: { padding: "2px 6px", color: token.colorPrimary, fontSize: 12, fontWeight: 600, background: token.colorPrimaryBg, borderRadius: token.borderRadiusSM },
  rule: { display: "flex", flexDirection: "column", gap: 4 },
  ruleTitle: { fontSize: 12, fontWeight: 500, lineHeight: "18px" },
  hint: { color: token.colorTextTertiary, fontSize: 12, lineHeight: "18px" },
  divider: { height: 1, background: token.colorBorderSecondary },
  radioGroup: { display: "flex", flexDirection: "column", gap: 5, marginTop: 2 },
}));

export const StoreOrderProcessingModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as EditStoreOrderProcessingModalPayload;
  const { store } = typedPayload;
  const updateMutation = useUpdateGeneralSettings();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { isDirty } } =
    useForm<StoreOrderProcessingFormValues>({
      defaultValues: {
        orderNumberPrefix: store.orderProcessing.orderNumberPrefix,
        orderNumberSuffix: store.orderProcessing.orderNumberSuffix ?? "",
        requireCheckoutConfirmation: store.orderProcessing.requireCheckoutConfirmation,
        automaticFulfillmentMode: store.orderProcessing.automaticFulfillmentMode,
        automaticallyArchiveOrders: store.orderProcessing.automaticallyArchiveOrders,
      },
    });
  const [prefix, suffix] = useWatch({
    control,
    name: ["orderNumberPrefix", "orderNumberSuffix"],
  });

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);
    const result = await updateMutation.updateStore({
      storeId: store.id,
      expectedRevision: store.revision,
      operations: mapStoreOrderProcessingInput(values),
    });
    const operationErrors = result.operationResults.flatMap(({ applied, errors }) => applied ? [] : errors);
    const errors = [...result.userErrors, ...operationErrors];
    if (!result.data || errors.length > 0) {
      setSubmitError([...new Set(errors.map(({ message: errorMessage }) => errorMessage))].join("\n") || updateMutation.error?.message || "Order processing settings could not be saved.");
      return;
    }
    await typedPayload.onSaved?.();
    message.success("Order processing updated");
    forcePop();
  });

  return (
    <ModalLayout
      name="store-order-processing"
      header={<ModalHeader name="store-order-processing" onClose={pop} submitButtonProps={{ children: "Save", disabled: !isDirty, loading: updateMutation.loading, onClick: submit }} title="Edit Order Processing" />}
    >
      <div className={styles.intro}>
        <Typography.Text className={styles.introTitle}>Order processing</Typography.Text>
        <Typography.Text className={styles.introCopy}>Configure order numbering, checkout confirmation, fulfillment and archiving.</Typography.Text>
      </div>
      {submitError ? <Alert message={submitError} showIcon type="error" /> : null}
      <form className={styles.form} onSubmit={submit}>
        <Paper className={styles.paper}>
          <div className={styles.paperHeader}>
            <Typography.Text strong>Order ID format</Typography.Text>
          </div>
          <div className={styles.paperBody}>
            <div className={styles.inputGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Prefix</span>
                <Controller control={control} name="orderNumberPrefix" render={({ field }) => <Input {...field} maxLength={16} placeholder="e.g. #" />} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Suffix</span>
                <Controller control={control} name="orderNumberSuffix" render={({ field }) => <Input {...field} maxLength={16} placeholder="Optional" />} />
              </label>
            </div>
            <div className={styles.preview}><span className={styles.previewLabel}>Preview</span><span className={styles.previewValue}>{prefix}1001{suffix}</span></div>
          </div>
        </Paper>
        <Paper className={styles.paper}>
          <div className={styles.paperHeader}>
            <Typography.Text strong>Processing rules</Typography.Text>
          </div>
          <div className={styles.paperBody}>
            <div className={styles.rule}>
              <span className={styles.ruleTitle}>Checkout confirmation</span>
              <Controller control={control} name="requireCheckoutConfirmation" render={({ field }) => <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)}>Require a confirmation step</Checkbox>} />
              <span className={styles.hint}>Customers review their order details before purchasing.</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.rule}>
              <span className={styles.ruleTitle}>Automatic fulfillment</span>
              <span className={styles.hint}>After payment, select one automatic fulfillment behavior.</span>
              <Controller control={control} name="automaticFulfillmentMode" render={({ field }) => (
                <Radio.Group {...field} className={styles.radioGroup}>
                  <Radio value={AutomaticFulfillmentMode.AllLineItems}>Automatically fulfill all line items</Radio>
                  <Radio value={AutomaticFulfillmentMode.GiftCardsOnly}>Automatically fulfill gift cards only</Radio>
                  <Radio value={AutomaticFulfillmentMode.Disabled}>Do not fulfill line items automatically</Radio>
                </Radio.Group>
              )} />
            </div>
            <div className={styles.divider} />
            <div className={styles.rule}>
              <span className={styles.ruleTitle}>Automatic archiving</span>
              <Controller control={control} name="automaticallyArchiveOrders" render={({ field }) => <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)}>Automatically archive the order</Checkbox>} />
              <span className={styles.hint}>Archive after the order is fulfilled and paid, or when all items are refunded.</span>
            </div>
          </div>
        </Paper>
      </form>
    </ModalLayout>
  );
};
