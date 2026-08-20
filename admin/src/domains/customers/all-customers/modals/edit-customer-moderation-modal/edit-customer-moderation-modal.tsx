"use client";

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "antd";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  cleanOptional,
  CustomerFormField,
  CustomerSectionModalFrame,
  customerModerationSchema,
  type CustomerModerationValues,
  useCustomerSectionModal,
} from "../shared";

export function EditCustomerModerationModal() {
  const state = useCustomerSectionModal("Moderation note updated");
  const initialized = useRef(false);
  const lastReload = useRef(-1);
  const form = useForm<CustomerModerationValues>({
    resolver: zodResolver(customerModerationSchema),
    defaultValues: { moderationNote: "" },
    mode: "onChange",
  });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isValid },
  } = form;
  useEffect(() => {
    if (!state.customer || (initialized.current && lastReload.current === state.reloadVersion))
      return;
    reset({ moderationNote: state.customer.moderationNote ?? "" });
    initialized.current = true;
    lastReload.current = state.reloadVersion;
  }, [reset, state.customer, state.reloadVersion]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);
  const submit = handleSubmit(async (values) => {
    await state.save<CustomerModerationValues>(
      { moderation: { moderationNote: cleanOptional(values.moderationNote) } },
      { "moderation.moderationNote": "moderationNote" },
      setError,
    );
  });
  return (
    <CustomerSectionModalFrame
      name="customer-edit-moderation"
      title="Edit moderation note"
      loading={state.mutationLoading}
      disabled={!isDirty || !isValid || !state.customer || state.conflict}
      onSubmit={() => void submit()}
      onClose={state.pop}
      queryLoading={state.queryLoading}
      hasCustomer={Boolean(state.customer)}
      error={state.error}
      conflict={state.conflict}
      onReload={() => void state.reloadLatest(isDirty)}
    >
      {state.customer ? (
        <Paper>
          <PaperHeader title="Internal moderation context" />
          <CustomerFormField
            label="Moderation note"
            error={errors.moderationNote?.message}
            help="This note is never shown to the customer."
          >
            <Controller
              name="moderationNote"
              control={control}
              render={({ field }) => (
                <Input.TextArea
                  {...field}
                  autoFocus
                  rows={6}
                  maxLength={2000}
                  showCount
                  status={errors.moderationNote ? "error" : undefined}
                />
              )}
            />
          </CustomerFormField>
        </Paper>
      ) : null}
    </CustomerSectionModalFrame>
  );
}
