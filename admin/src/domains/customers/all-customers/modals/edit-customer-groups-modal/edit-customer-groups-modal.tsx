"use client";

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Select } from "antd";
import { CustomerAssignmentSource } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useCustomerEditorContext } from "../../hooks";
import {
  CustomerFormField,
  CustomerSectionModalFrame,
  customerGroupsSchema,
  type CustomerGroupsValues,
  useCustomerSectionModal,
} from "../shared";

export function EditCustomerGroupsModal() {
  const state = useCustomerSectionModal("Customer groups updated");
  const context = useCustomerEditorContext();
  const initialized = useRef(false);
  const lastReload = useRef(-1);
  const form = useForm<CustomerGroupsValues>({
    resolver: zodResolver(customerGroupsSchema),
    defaultValues: { groupIds: [], primaryGroupId: null },
    mode: "onChange",
  });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    setValue,
    formState: { errors, isDirty, isValid },
  } = form;
  const groupIds = watch("groupIds");
  const truncated =
    Boolean(
      state.customer &&
      state.customer.groupMemberships.totalCount > state.customer.groupMemberships.edges.length,
    ) || Boolean(context.context?.truncated.groups);
  useEffect(() => {
    if (!state.customer || (initialized.current && lastReload.current === state.reloadVersion))
      return;
    const memberships = state.customer.groupMemberships.edges.map((edge) => edge.node);
    const manual = memberships.filter((item) => item.source === CustomerAssignmentSource.Manual);
    reset({
      groupIds: manual.map((item) => item.group.id),
      primaryGroupId: manual.find((item) => item.isPrimary)?.group.id ?? null,
    });
    initialized.current = true;
    lastReload.current = state.reloadVersion;
  }, [reset, state.customer, state.reloadVersion]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);
  const submit = handleSubmit(async (values) => {
    await state.save<CustomerGroupsValues>(
      {
        groups: {
          memberships: values.groupIds.map((groupId) => ({
            groupId,
            isPrimary: groupId === values.primaryGroupId,
          })),
        },
      },
      { "groups.memberships": "groupIds" },
      setError,
    );
  });
  return (
    <CustomerSectionModalFrame
      name="customer-edit-groups"
      title="Edit customer groups"
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
          <>
            {truncated ? (
              <Alert
                type="warning"
                showIcon
                message="All editable group memberships must be loaded before this complete-replacement editor can save."
              />
            ) : null}
          </>
          <Paper>
            <PaperHeader title="Manual group memberships" />
            <CustomerFormField
              label="Groups *"
              error={errors.groupIds?.message}
              help="Rule, import, and system memberships remain unchanged."
            >
              <Controller
                name="groupIds"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    mode="multiple"
                    showSearch
                    optionFilterProp="label"
                    options={context.context?.groups.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                    onChange={(value) => {
                      field.onChange(value);
                      const primary = form.getValues("primaryGroupId");
                      if (primary && !value.includes(primary))
                        setValue("primaryGroupId", null, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                    }}
                    style={{ width: "100%" }}
                  />
                )}
              />
            </CustomerFormField>
            <div style={{ marginTop: 16 }}>
              <CustomerFormField label="Primary group" error={errors.primaryGroupId?.message}>
                <Controller
                  name="primaryGroupId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      value={field.value ?? undefined}
                      allowClear
                      options={context.context?.groups
                        .filter((item) => groupIds.includes(item.id))
                        .map((item) => ({ value: item.id, label: item.name }))}
                      onChange={(value) => field.onChange(value ?? null)}
                      style={{ width: "100%" }}
                    />
                  )}
                />
              </CustomerFormField>
            </div>
          </Paper>
        </>
      ) : null}
    </CustomerSectionModalFrame>
  );
}
