"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox, Input, Select } from "antd";
import { shopCountries } from "@/defs/localization";
import { CustomerTaxIdentifierStatus } from "@/graphql/types";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { CustomerTaxIdentifierItemModalPayload } from "../../modals";
import { enumLabel } from "../../components/customer-details-card/customer-details-utils";
import { CustomerFormField, customerTaxIdentifierDraftSchema, type CustomerTaxIdentifierDraft, useCustomerFormStyles } from "../shared";

export function EditCustomerTaxIdentifierModal() {
  const { payload, pop, forcePop, setDirty } = useModalStackContext(); const value = payload as CustomerTaxIdentifierItemModalPayload; const { styles } = useCustomerFormStyles();
  const form = useForm<CustomerTaxIdentifierDraft>({ resolver: zodResolver(customerTaxIdentifierDraftSchema), defaultValues: value.item, mode: "onChange" }); const { control, handleSubmit, formState: { errors, isDirty, isValid } } = form;
  useEffect(() => setDirty(isDirty), [isDirty, setDirty]); const apply = handleSubmit((item) => { value.onApply(item); setDirty(false); forcePop(); });
  return <ModalLayout name="customer-edit-tax-identifier" header={<ModalHeader name="customer-edit-tax-identifier" title={value.title} onClose={pop} submitButtonProps={{ children: "Apply", disabled: !isDirty || !isValid, onClick: () => void apply() }} />}>
    <Paper><PaperHeader title="Tax identifier" /><div className={styles.grid}>
      <CustomerFormField label="Type *" error={errors.identifierType?.message}><Controller name="identifierType" control={control} render={({ field }) => <Input {...field} autoFocus status={errors.identifierType ? "error" : undefined} />} /></CustomerFormField>
      <CustomerFormField label="Country" error={errors.countryCode?.message}><Controller name="countryCode" control={control} render={({ field }) => <Select {...field} allowClear showSearch optionFilterProp="label" options={shopCountries.map((country) => ({ value: country.value, label: `${country.name} (${country.value})` }))} style={{ width: "100%" }} />} /></CustomerFormField>
      <div className={styles.full}><CustomerFormField label="Value *" error={errors.value?.message}><Controller name="value" control={control} render={({ field }) => <Input {...field} status={errors.value ? "error" : undefined} />} /></CustomerFormField></div>
      <CustomerFormField label="Status *" error={errors.status?.message}><Controller name="status" control={control} render={({ field }) => <Select {...field} options={Object.values(CustomerTaxIdentifierStatus).map((item) => ({ value: item, label: enumLabel(item) }))} style={{ width: "100%" }} />} /></CustomerFormField>
      <CustomerFormField label="Valid from" error={errors.validFrom?.message}><Controller name="validFrom" control={control} render={({ field }) => <Input {...field} type="date" />} /></CustomerFormField>
      <CustomerFormField label="Valid to" error={errors.validTo?.message}><Controller name="validTo" control={control} render={({ field }) => <Input {...field} type="date" />} /></CustomerFormField>
      <Controller name="isPrimary" control={control} render={({ field }) => <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)}>Primary identifier</Checkbox>} />
    </div></Paper>
  </ModalLayout>;
}
