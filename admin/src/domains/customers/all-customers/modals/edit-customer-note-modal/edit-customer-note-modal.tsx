"use client";

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "antd";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { cleanOptional, CustomerFormField, CustomerSectionModalFrame, customerNoteSchema, type CustomerNoteValues, useCustomerSectionModal } from "../shared";

export function EditCustomerNoteModal() {
  const state = useCustomerSectionModal("Merchant note updated"); const initialized = useRef(false); const lastReload = useRef(-1);
  const form = useForm<CustomerNoteValues>({ resolver: zodResolver(customerNoteSchema), defaultValues: { note: "" }, mode: "onChange" });
  const { control, handleSubmit, reset, setError, formState: { errors, isDirty, isValid } } = form;
  useEffect(() => { if (!state.customer || (initialized.current && lastReload.current === state.reloadVersion)) return; reset({ note: state.customer.note ?? "" }); initialized.current = true; lastReload.current = state.reloadVersion; }, [reset, state.customer, state.reloadVersion]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);
  const submit = handleSubmit(async (values) => { await state.save<CustomerNoteValues>({ note: { note: cleanOptional(values.note) } }, { "note.note": "note" }, setError); });
  return <CustomerSectionModalFrame name="customer-edit-note" title="Edit merchant note" loading={state.mutationLoading} disabled={!isDirty || !isValid || !state.customer || state.conflict} onSubmit={() => void submit()} onClose={state.pop} queryLoading={state.queryLoading} hasCustomer={Boolean(state.customer)} error={state.error} conflict={state.conflict} onReload={() => void state.reloadLatest(isDirty)}>{state.customer ? <Paper><PaperHeader title="Merchant note" /><CustomerFormField label="Merchant note" error={errors.note?.message} help="Visible only to store administrators."><Controller name="note" control={control} render={({ field }) => <Input.TextArea {...field} autoFocus rows={6} maxLength={2000} showCount status={errors.note ? "error" : undefined} />} /></CustomerFormField></Paper> : null}</CustomerSectionModalFrame>;
}
