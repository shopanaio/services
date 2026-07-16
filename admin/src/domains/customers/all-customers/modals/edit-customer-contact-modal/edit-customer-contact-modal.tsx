"use client";

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Input, Typography } from "antd";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { cleanOptional, CustomerFormField, CustomerSectionModalFrame, customerContactSchema, type CustomerContactValues, useCustomerSectionModal } from "../shared";

export function EditCustomerContactModal() {
  const state = useCustomerSectionModal("Contact details updated");
  const initialized = useRef(false); const lastReload = useRef(-1);
  const form = useForm<CustomerContactValues>({ resolver: zodResolver(customerContactSchema), defaultValues: { email: "", phoneE164: "" }, mode: "onChange" });
  const { control, handleSubmit, reset, setError, formState: { errors, isDirty, isValid } } = form;
  useEffect(() => { if (!state.customer || (initialized.current && lastReload.current === state.reloadVersion)) return; reset({ email: state.customer.email ?? "", phoneE164: state.customer.phoneE164 ?? "" }); initialized.current = true; lastReload.current = state.reloadVersion; }, [reset, state.customer, state.reloadVersion]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);
  const submit = handleSubmit(async (values) => { await state.save<CustomerContactValues>({ contact: { email: cleanOptional(values.email.toLowerCase()), phoneE164: cleanOptional(values.phoneE164) } }, { "contact.email": "email", "contact.phoneE164": "phoneE164" }, setError); });
  return <CustomerSectionModalFrame name="customer-edit-contact" title="Edit contact details" loading={state.mutationLoading} disabled={!isDirty || !isValid || !state.customer || state.conflict} onSubmit={() => void submit()} onClose={state.pop} queryLoading={state.queryLoading} hasCustomer={Boolean(state.customer)} error={state.error} conflict={state.conflict} onReload={() => void state.reloadLatest(isDirty)}>
    {state.customer ? <Paper><PaperHeader title="Contact details" />
      <CustomerFormField label="Email" error={errors.email?.message} help={`Current state: ${state.customer.emailVerified ? "Verified" : "Not verified"}`}><Controller name="email" control={control} render={({ field }) => <Input {...field} type="email" autoFocus status={errors.email ? "error" : undefined} />} /></CustomerFormField>
      <div style={{ marginTop: 16 }}><CustomerFormField label="Phone" error={errors.phoneE164?.message} help={`Current state: ${state.customer.phoneVerified ? "Verified" : "Not verified"}`}><Controller name="phoneE164" control={control} render={({ field }) => <Input {...field} status={errors.phoneE164 ? "error" : undefined} />} /></CustomerFormField></div>
      <Alert style={{ marginTop: 16 }} type="info" showIcon message="Changing a contact value does not mark it as verified." />
      {state.customer.consents.some((consent) => consent.contactPoint === state.customer?.email || consent.contactPoint === state.customer?.phoneE164) ? <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>Marketing consent contact points are managed separately and will not be changed.</Typography.Paragraph> : null}
    </Paper> : null}
  </CustomerSectionModalFrame>;
}
