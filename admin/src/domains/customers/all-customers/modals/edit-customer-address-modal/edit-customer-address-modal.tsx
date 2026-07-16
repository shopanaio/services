"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox, Input, Select } from "antd";
import { shopCountries } from "@/defs/localization";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { CustomerAddressItemModalPayload } from "../../modals";
import { CustomerFormField, customerAddressDraftSchema, type CustomerAddressDraft, useCustomerFormStyles } from "../shared";

export function EditCustomerAddressModal() {
  const { payload, pop, forcePop, setDirty } = useModalStackContext(); const value = payload as CustomerAddressItemModalPayload; const { styles } = useCustomerFormStyles();
  const form = useForm<CustomerAddressDraft>({ resolver: zodResolver(customerAddressDraftSchema), defaultValues: value.item, mode: "onChange" });
  const { control, handleSubmit, formState: { errors, isDirty, isValid } } = form;
  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);
  const apply = handleSubmit((item) => { value.onApply(item); setDirty(false); forcePop(); });
  return <ModalLayout name="customer-edit-address" header={<ModalHeader name="customer-edit-address" title={value.title} onClose={pop} submitButtonProps={{ children: "Apply", disabled: !isDirty || !isValid, onClick: () => void apply() }} />}>
    <Paper><PaperHeader title="Address identity" /><div className={styles.grid}>
      <CustomerFormField label="Label" error={errors.label?.message}><Controller name="label" control={control} render={({ field }) => <Input {...field} autoFocus />} /></CustomerFormField>
      <CustomerFormField label="Company" error={errors.companyName?.message}><Controller name="companyName" control={control} render={({ field }) => <Input {...field} />} /></CustomerFormField>
      <CustomerFormField label="Prefix" error={errors.prefix?.message}><Controller name="prefix" control={control} render={({ field }) => <Input {...field} />} /></CustomerFormField>
      <CustomerFormField label="First name" error={errors.firstName?.message}><Controller name="firstName" control={control} render={({ field }) => <Input {...field} />} /></CustomerFormField>
      <CustomerFormField label="Middle name" error={errors.middleName?.message}><Controller name="middleName" control={control} render={({ field }) => <Input {...field} />} /></CustomerFormField>
      <CustomerFormField label="Last name" error={errors.lastName?.message}><Controller name="lastName" control={control} render={({ field }) => <Input {...field} />} /></CustomerFormField>
      <CustomerFormField label="Suffix" error={errors.suffix?.message}><Controller name="suffix" control={control} render={({ field }) => <Input {...field} />} /></CustomerFormField>
      <CustomerFormField label="Phone" error={errors.phoneE164?.message}><Controller name="phoneE164" control={control} render={({ field }) => <Input {...field} status={errors.phoneE164 ? "error" : undefined} />} /></CustomerFormField>
    </div></Paper>
    <Paper><PaperHeader title="Location" /><div className={styles.grid}>
      <div className={styles.full}><CustomerFormField label="Address line 1 *" error={errors.address1?.message}><Controller name="address1" control={control} render={({ field }) => <Input {...field} status={errors.address1 ? "error" : undefined} />} /></CustomerFormField></div>
      <div className={styles.full}><CustomerFormField label="Address line 2" error={errors.address2?.message}><Controller name="address2" control={control} render={({ field }) => <Input {...field} />} /></CustomerFormField></div>
      <CustomerFormField label="City *" error={errors.city?.message}><Controller name="city" control={control} render={({ field }) => <Input {...field} status={errors.city ? "error" : undefined} />} /></CustomerFormField>
      <CustomerFormField label="Region" error={errors.regionName?.message}><Controller name="regionName" control={control} render={({ field }) => <Input {...field} />} /></CustomerFormField>
      <CustomerFormField label="Region code" error={errors.regionCode?.message}><Controller name="regionCode" control={control} render={({ field }) => <Input {...field} />} /></CustomerFormField>
      <CustomerFormField label="Postal code" error={errors.postalCode?.message}><Controller name="postalCode" control={control} render={({ field }) => <Input {...field} />} /></CustomerFormField>
      <CustomerFormField label="Country *" error={errors.countryCode?.message}><Controller name="countryCode" control={control} render={({ field }) => <Select {...field} showSearch optionFilterProp="label" options={shopCountries.map((country) => ({ value: country.value, label: `${country.name} (${country.value})` }))} status={errors.countryCode ? "error" : undefined} style={{ width: "100%" }} />} /></CustomerFormField>
    </div></Paper>
    <Paper><PaperHeader title="Defaults" /><div className={styles.grid}><Controller name="isDefaultShipping" control={control} render={({ field }) => <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)}>Default shipping</Checkbox>} /><Controller name="isDefaultBilling" control={control} render={({ field }) => <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)}>Default billing</Checkbox>} /></div></Paper>
  </ModalLayout>;
}
