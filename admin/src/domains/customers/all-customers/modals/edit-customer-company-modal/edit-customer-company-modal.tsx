"use client";

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "antd";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { cleanOptional, CustomerFormField, CustomerSectionModalFrame, customerCompanySchema, type CustomerCompanyValues, useCustomerSectionModal } from "../shared";

export function EditCustomerCompanyModal() {
  const state = useCustomerSectionModal("Company updated"); const initialized = useRef(false); const lastReload = useRef(-1);
  const form = useForm<CustomerCompanyValues>({ resolver: zodResolver(customerCompanySchema), defaultValues: { companyName: "", jobTitle: "" }, mode: "onChange" });
  const { control, handleSubmit, reset, setError, formState: { errors, isDirty, isValid } } = form;
  useEffect(() => { if (!state.customer || (initialized.current && lastReload.current === state.reloadVersion)) return; reset({ companyName: state.customer.companyName ?? "", jobTitle: state.customer.jobTitle ?? "" }); initialized.current = true; lastReload.current = state.reloadVersion; }, [reset, state.customer, state.reloadVersion]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);
  const submit = handleSubmit(async (values) => { await state.save<CustomerCompanyValues>({ company: { companyName: cleanOptional(values.companyName), jobTitle: cleanOptional(values.jobTitle) } }, { "company.companyName": "companyName", "company.jobTitle": "jobTitle" }, setError); });
  return <CustomerSectionModalFrame name="customer-edit-company" title="Edit company" loading={state.mutationLoading} disabled={!isDirty || !isValid || !state.customer || state.conflict} onSubmit={() => void submit()} onClose={state.pop} queryLoading={state.queryLoading} hasCustomer={Boolean(state.customer)} error={state.error} conflict={state.conflict} onReload={() => void state.reloadLatest(isDirty)}>
    {state.customer ? <Paper><PaperHeader title="Company" /><CustomerFormField label="Company name" error={errors.companyName?.message}><Controller name="companyName" control={control} render={({ field }) => <Input {...field} autoFocus />} /></CustomerFormField><div style={{ marginTop: 16 }}><CustomerFormField label="Job title" error={errors.jobTitle?.message}><Controller name="jobTitle" control={control} render={({ field }) => <Input {...field} />} /></CustomerFormField></div></Paper> : null}
  </CustomerSectionModalFrame>;
}
