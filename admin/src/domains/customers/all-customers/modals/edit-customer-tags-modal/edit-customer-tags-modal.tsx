"use client";

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Select } from "antd";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useCustomerEditorContext } from "../../hooks";
import {
  CustomerFormField,
  CustomerSectionModalFrame,
  customerTagsSchema,
  type CustomerTagsValues,
  useCustomerSectionModal,
} from "../shared";

export function EditCustomerTagsModal() {
  const state = useCustomerSectionModal("Customer tags updated");
  const context = useCustomerEditorContext();
  const initialized = useRef(false);
  const lastReload = useRef(-1);
  const form = useForm<CustomerTagsValues>({
    resolver: zodResolver(customerTagsSchema),
    defaultValues: { tagIds: [] },
    mode: "onChange",
  });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isValid },
  } = form;
  const truncated =
    Boolean(
      state.customer &&
      state.customer.tagAssignments.totalCount > state.customer.tagAssignments.edges.length,
    ) || Boolean(context.context?.truncated.tags);
  useEffect(() => {
    if (!state.customer || (initialized.current && lastReload.current === state.reloadVersion))
      return;
    reset({ tagIds: state.customer.tagAssignments.edges.map((edge) => edge.node.tag.id) });
    initialized.current = true;
    lastReload.current = state.reloadVersion;
  }, [reset, state.customer, state.reloadVersion]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);
  const submit = handleSubmit(async (values) => {
    await state.save<CustomerTagsValues>(
      { tags: { tagIds: values.tagIds } },
      { "tags.tagIds": "tagIds" },
      setError,
    );
  });
  return (
    <CustomerSectionModalFrame
      name="customer-edit-tags"
      title="Edit customer tags"
      loading={state.mutationLoading}
      disabled={
        !isDirty || !isValid || !state.customer || state.conflict || context.loading || truncated
      }
      onSubmit={() => void submit()}
      onClose={state.pop}
      queryLoading={state.queryLoading || context.loading}
      hasCustomer={Boolean(state.customer)}
      error={state.error ?? context.error?.message ?? null}
      conflict={state.conflict}
      onReload={() => void state.reloadLatest(isDirty)}
    >
      {state.customer ? (
        <>
          {truncated ? (
            <Alert
              type="warning"
              showIcon
              message="All tag assignments and options must be loaded before this complete-replacement editor can save."
            />
          ) : null}
          <Paper>
            <PaperHeader title="Tags" />
            <CustomerFormField
              label="Tags"
              error={errors.tagIds?.message}
              help="Selected tags replace the customer's current tag assignments."
            >
              <Controller
                name="tagIds"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    mode="multiple"
                    showSearch
                    optionFilterProp="label"
                    options={context.context?.tags.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                    style={{ width: "100%" }}
                  />
                )}
              />
            </CustomerFormField>
          </Paper>
        </>
      ) : null}
    </CustomerSectionModalFrame>
  );
}
