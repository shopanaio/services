"use client";

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Flex, Select, Tag, Typography } from "antd";
import { CustomerAssignmentSource } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useCustomerEditorContext } from "../../hooks";
import { enumLabel } from "../../components/customer-details-card/customer-details-utils";
import {
  CustomerFormField,
  CustomerSectionModalFrame,
  customerSegmentsSchema,
  type CustomerSegmentsValues,
  useCustomerSectionModal,
} from "../shared";

export function EditCustomerSegmentsModal() {
  const state = useCustomerSectionModal("Manual segments updated");
  const context = useCustomerEditorContext();
  const initialized = useRef(false);
  const lastReload = useRef(-1);
  const form = useForm<CustomerSegmentsValues>({
    resolver: zodResolver(customerSegmentsSchema),
    defaultValues: { segmentIds: [] },
    mode: "onChange",
  });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isValid },
  } = form;
  const memberships = state.customer?.segmentMemberships.edges.map((edge) => edge.node) ?? [];
  const calculated = memberships.filter((item) => item.source !== CustomerAssignmentSource.Manual);
  const truncated =
    Boolean(
      state.customer &&
      state.customer.segmentMemberships.totalCount > state.customer.segmentMemberships.edges.length,
    ) || Boolean(context.context?.truncated.segments);
  useEffect(() => {
    if (!state.customer || (initialized.current && lastReload.current === state.reloadVersion))
      return;
    reset({
      segmentIds: state.customer.segmentMemberships.edges
        .filter((edge) => edge.node.source === CustomerAssignmentSource.Manual)
        .map((edge) => edge.node.segment.id),
    });
    initialized.current = true;
    lastReload.current = state.reloadVersion;
  }, [reset, state.customer, state.reloadVersion]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);
  const submit = handleSubmit(async (values) => {
    await state.save<CustomerSegmentsValues>(
      { segments: { segmentIds: values.segmentIds } },
      { "segments.segmentIds": "segmentIds" },
      setError,
    );
  });
  return (
    <CustomerSectionModalFrame
      name="customer-edit-segments"
      title="Edit manual segments"
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
              message="All segment memberships and options must be loaded before this complete-replacement editor can save."
            />
          ) : null}
          <Paper>
            <PaperHeader title="Manual memberships" />
            <CustomerFormField label="Manual segments" error={errors.segmentIds?.message}>
              <Controller
                name="segmentIds"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    mode="multiple"
                    showSearch
                    optionFilterProp="label"
                    options={context.context?.segments.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                    style={{ width: "100%" }}
                  />
                )}
              />
            </CustomerFormField>
            <Typography.Text strong style={{ display: "block", marginTop: 20 }}>
              Read-only calculated memberships
            </Typography.Text>
            <Flex gap={6} wrap="wrap" style={{ marginTop: 8 }}>
              {calculated.length ? (
                calculated.map((item) => (
                  <Tag key={item.id}>
                    {item.segment.name} · {enumLabel(item.source)}
                  </Tag>
                ))
              ) : (
                <Typography.Text type="secondary">No calculated memberships</Typography.Text>
              )}
            </Flex>
          </Paper>
        </>
      ) : null}
    </CustomerSectionModalFrame>
  );
}
