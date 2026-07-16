"use client";

import { useCallback, useEffect } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, Input, Select } from "antd";
import { createStyles } from "antd-style";
import { shopLocales } from "@/defs/localization";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useCreateCustomer } from "../../hooks";
import type { CustomerCreateModalPayload } from "../../modals";
import { createCustomerSchema, type CreateCustomerFormValues } from "./schema";

const useStyles = createStyles(({ token }) => ({
  container: { display: "flex", flexDirection: "column", gap: token.padding },
  fields: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: token.padding },
  full: { gridColumn: "1 / -1" },
  label: { display: "block", marginBottom: 6, fontWeight: 500 },
  error: { color: token.colorError, fontSize: 12, marginTop: 4 },
}));

const DEFAULT_VALUES: CreateCustomerFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phoneE164: "",
  preferredLocale: "en",
};

export function CreateCustomerModal() {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as CustomerCreateModalPayload;
  const { createCustomer, loading, error } = useCreateCustomer();
  const methods = useForm<CreateCustomerFormValues>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  });
  const { control, handleSubmit, setError, formState: { errors, isDirty, isValid } } = methods;

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const submit = useCallback(async (values: CreateCustomerFormValues) => {
    const result = await createCustomer({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim().toLowerCase(),
      phoneE164: values.phoneE164.trim() || null,
      preferredLocale: values.preferredLocale,
    });
    if (!result.customer || result.userErrors.length > 0) {
      for (const item of result.userErrors) {
        const field = item.field?.at(-1);
        if (field === "firstName" || field === "lastName" || field === "email" || field === "phoneE164" || field === "preferredLocale") {
          setError(field, { message: item.message });
        }
      }
      message.error(result.userErrors[0]?.message ?? "Unable to create customer");
      return;
    }
    await typedPayload.onCreated?.(result.customer.id);
    setDirty(false);
    message.success("Customer created");
    forcePop();
  }, [createCustomer, forcePop, message, setDirty, setError, typedPayload]);

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="customer-create"
        header={<ModalHeader name="customer-create" title="New customer" onClose={pop} submitButtonProps={{ children: "Create", loading, disabled: loading || !isValid, onClick: handleSubmit(submit) }} />}
      >
        <div className={styles.container}>
          {error ? <Alert type="error" showIcon message={error.message} /> : null}
          <Paper>
            <PaperHeader title="Basic information" />
            <div className={styles.fields}>
              <div>
                <label className={styles.label} htmlFor="new-customer-first-name">First name</label>
                <Controller name="firstName" control={control} render={({ field }) => <Input {...field} id="new-customer-first-name" status={errors.firstName ? "error" : undefined} />} />
                {errors.firstName ? <div className={styles.error}>{errors.firstName.message}</div> : null}
              </div>
              <div>
                <label className={styles.label} htmlFor="new-customer-last-name">Last name</label>
                <Controller name="lastName" control={control} render={({ field }) => <Input {...field} id="new-customer-last-name" status={errors.lastName ? "error" : undefined} />} />
                {errors.lastName ? <div className={styles.error}>{errors.lastName.message}</div> : null}
              </div>
              <div>
                <label className={styles.label} htmlFor="new-customer-email">Email</label>
                <Controller name="email" control={control} render={({ field }) => <Input {...field} id="new-customer-email" type="email" status={errors.email ? "error" : undefined} />} />
                {errors.email ? <div className={styles.error}>{errors.email.message}</div> : null}
              </div>
              <div>
                <label className={styles.label} htmlFor="new-customer-phone">Phone</label>
                <Controller name="phoneE164" control={control} render={({ field }) => <Input {...field} id="new-customer-phone" type="tel" status={errors.phoneE164 ? "error" : undefined} />} />
                {errors.phoneE164 ? <div className={styles.error}>{errors.phoneE164.message}</div> : null}
              </div>
              <div className={styles.full}>
                <label className={styles.label} htmlFor="new-customer-locale">Preferred locale</label>
                <Controller name="preferredLocale" control={control} render={({ field }) => <Select {...field} id="new-customer-locale" options={shopLocales.map((locale) => ({ value: locale.value, label: locale.name }))} style={{ width: "100%" }} />} />
              </div>
            </div>
          </Paper>
        </div>
      </ModalLayout>
    </FormProvider>
  );
}
