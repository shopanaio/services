"use client";

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Segmented, Typography } from "antd";
import { LuBan as BlockedOutlined, LuCheck as ActiveOutlined, LuPause as DisabledOutlined } from "react-icons/lu";
import { CustomerAdminLifecycleStatus, CustomerLifecycleStatus } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { cleanOptional, CustomerFormField, CustomerSectionModalFrame, customerStatusSchema, type CustomerStatusValues, useCustomerSectionModal } from "../shared";
import { formatCustomerDate } from "../../components/customer-details-card/customer-details-utils";

const consequence = {
  [CustomerAdminLifecycleStatus.Active]: "Customer can participate in normal store flows.",
  [CustomerAdminLifecycleStatus.Disabled]: "The customer account is disabled by an administrator.",
  [CustomerAdminLifecycleStatus.Blocked]: "The customer is blocked from normal store flows until an administrator changes this status.",
};

function editableStatus(status: CustomerLifecycleStatus) {
  if (status === CustomerLifecycleStatus.Blocked) return CustomerAdminLifecycleStatus.Blocked;
  if (status === CustomerLifecycleStatus.Disabled) return CustomerAdminLifecycleStatus.Disabled;
  return CustomerAdminLifecycleStatus.Active;
}

export function EditCustomerStatusModal() {
  const state = useCustomerSectionModal("Customer status updated"); const initialized = useRef(false); const lastReload = useRef(-1);
  const form = useForm<CustomerStatusValues>({ resolver: zodResolver(customerStatusSchema), defaultValues: { status: CustomerAdminLifecycleStatus.Active, blockedReason: "" }, mode: "onChange" });
  const { control, handleSubmit, reset, setError, watch, formState: { errors, isDirty, isValid } } = form;
  const selected = watch("status");
  const terminal = state.customer ? [CustomerLifecycleStatus.Merged, CustomerLifecycleStatus.Redacted].includes(state.customer.lifecycleStatus) : false;
  useEffect(() => { if (!state.customer || (initialized.current && lastReload.current === state.reloadVersion)) return; reset({ status: editableStatus(state.customer.lifecycleStatus), blockedReason: state.customer.blockedReason ?? "" }); initialized.current = true; lastReload.current = state.reloadVersion; }, [reset, state.customer, state.reloadVersion]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);
  const submit = handleSubmit(async (values) => { await state.save<CustomerStatusValues>({ status: { status: values.status, blockedReason: values.status === CustomerAdminLifecycleStatus.Blocked ? cleanOptional(values.blockedReason) : null } }, { "status.status": "status", "status.blockedReason": "blockedReason" }, setError); });
  return <CustomerSectionModalFrame name="customer-edit-status" title="Change customer status" loading={state.mutationLoading} disabled={!isDirty || !isValid || !state.customer || state.conflict || terminal} onSubmit={() => void submit()} onClose={state.pop} queryLoading={state.queryLoading} hasCustomer={Boolean(state.customer)} error={terminal ? "Merged and redacted customers cannot be assigned an administrative account status." : state.error} conflict={state.conflict} onReload={() => void state.reloadLatest(isDirty)}>
    {state.customer && !terminal ? <>
      <Paper><PaperHeader title="Account status" /><Controller name="status" control={control} render={({ field }) => <Segmented {...field} block options={[{ value: CustomerAdminLifecycleStatus.Active, label: "Active", icon: <ActiveOutlined /> }, { value: CustomerAdminLifecycleStatus.Disabled, label: "Disabled", icon: <DisabledOutlined /> }, { value: CustomerAdminLifecycleStatus.Blocked, label: "Blocked", icon: <BlockedOutlined /> }]} />} />
        <div style={{ padding: 12, marginTop: 16, background: "var(--ant-color-fill-tertiary)", borderRadius: 8 }}><Typography.Text strong>{selected[0] + selected.slice(1).toLowerCase()}</Typography.Text><Typography.Paragraph style={{ margin: "4px 0 0" }}>{consequence[selected]}</Typography.Paragraph></div>
        {selected === CustomerAdminLifecycleStatus.Blocked ? <div style={{ marginTop: 16 }}><CustomerFormField label="Block reason *" error={errors.blockedReason?.message}><Controller name="blockedReason" control={control} render={({ field }) => <Input.TextArea {...field} rows={4} maxLength={2000} showCount status={errors.blockedReason ? "error" : undefined} />} /></CustomerFormField></div> : null}
      </Paper>
      <Typography.Text type="secondary">Current status: {state.customer.lifecycleStatus} · Updated {formatCustomerDate(state.customer.updatedAt)}</Typography.Text>
    </> : null}
  </CustomerSectionModalFrame>;
}
