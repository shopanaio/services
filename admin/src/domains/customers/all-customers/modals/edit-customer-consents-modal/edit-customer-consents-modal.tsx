"use client";

import { useEffect, useRef } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Flex, Input, Select, Tag, Typography } from "antd";
import type { ApiCustomer } from "@/graphql/types";
import {
  CustomerConsentAdminState,
  CustomerConsentChannel,
  CustomerConsentOptInLevel,
  CustomerConsentState,
} from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  enumLabel,
  formatCustomerDate,
} from "../../components/customer-details-card/customer-details-utils";
import {
  CustomerFormField,
  CustomerSectionModalFrame,
  customerConsentsSchema,
  type CustomerConsentsValues,
  sameDraft,
  useCustomerSectionModal,
} from "../shared";

function defaults(customer: ApiCustomer): CustomerConsentsValues {
  const existing = new Map(customer.consents.map((consent) => [consent.channel, consent]));
  return {
    channels: Object.values(CustomerConsentChannel).map((channel) => {
      const consent = existing.get(channel);
      const regular =
        consent &&
        ![CustomerConsentState.Invalid, CustomerConsentState.Redacted].includes(consent.state);
      const fallback =
        channel === CustomerConsentChannel.Email
          ? (customer.email ?? "")
          : [CustomerConsentChannel.Sms, CustomerConsentChannel.Whatsapp].includes(channel)
            ? (customer.phoneE164 ?? "")
            : "";
      return {
        channel,
        enabled: Boolean(regular),
        locked: consent?.state === CustomerConsentState.Redacted,
        existingState: consent?.state ?? null,
        state: regular ? (consent.state as unknown as CustomerConsentAdminState) : null,
        optInLevel: consent?.optInLevel ?? CustomerConsentOptInLevel.Unknown,
        contactPoint: consent?.contactPoint ?? fallback,
      };
    }),
  };
}

export function EditCustomerConsentsModal() {
  const state = useCustomerSectionModal("Marketing consents updated");
  const initialized = useRef(false);
  const lastReload = useRef(-1);
  const original = useRef<CustomerConsentsValues | null>(null);
  const form = useForm<CustomerConsentsValues>({
    resolver: zodResolver(customerConsentsSchema),
    defaultValues: { channels: [] },
    mode: "onChange",
  });
  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isDirty, isValid },
  } = form;
  const { fields } = useFieldArray({ control, name: "channels" });
  const values = watch("channels");
  useEffect(() => {
    if (!state.customer || (initialized.current && lastReload.current === state.reloadVersion))
      return;
    const next = defaults(state.customer);
    original.current = next;
    reset(next);
    initialized.current = true;
    lastReload.current = state.reloadVersion;
  }, [reset, state.customer, state.reloadVersion]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);
  const submit = handleSubmit(async (formValues) => {
    const changed = formValues.channels.filter(
      (row, index) =>
        row.enabled && row.state && !sameDraft(row, original.current?.channels[index]),
    );
    await state.save<CustomerConsentsValues>(
      {
        consents: {
          set: changed.map((row) => ({
            channel: row.channel,
            state: row.state!,
            optInLevel: row.optInLevel,
            contactPoint: row.contactPoint.trim(),
          })),
        },
      },
      { "consents.set": "channels" },
      setError,
    );
  });
  return (
    <CustomerSectionModalFrame
      name="customer-edit-consents"
      title="Edit marketing consents"
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
        <Flex vertical gap={12}>
          {fields.map((field, index) => {
            const current = state.customer?.consents.find(
              (consent) => consent.channel === field.channel,
            );
            const row = values[index];
            const rowErrors = errors.channels?.[index];
            return (
              <Paper key={field.id}>
                <PaperHeader
                  title={enumLabel(field.channel)}
                  extra={
                    <Typography.Text type="secondary">
                      Current:{" "}
                      {current
                        ? `${enumLabel(current.state)} · ${enumLabel(current.optInLevel)} · Updated ${formatCustomerDate(current.updatedAt)}`
                        : "No record"}
                    </Typography.Text>
                  }
                />
                {row?.locked ? (
                  <Typography.Text type="secondary">
                    This consent record was redacted and cannot be changed.
                  </Typography.Text>
                ) : !row?.enabled ? (
                  <Button
                    onClick={() =>
                      setValue(`channels.${index}.enabled`, true, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    Add consent state
                  </Button>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 16,
                    }}
                  >
                    <CustomerFormField label="State *" error={rowErrors?.state?.message}>
                      <Controller
                        name={`channels.${index}.state`}
                        control={control}
                        render={({ field: input }) => (
                          <Select
                            {...input}
                            value={input.value ?? undefined}
                            options={Object.values(CustomerConsentAdminState).map((item) => ({
                              value: item,
                              label: enumLabel(item),
                            }))}
                            style={{ width: "100%" }}
                          />
                        )}
                      />
                    </CustomerFormField>
                    <CustomerFormField label="Opt-in level" error={rowErrors?.optInLevel?.message}>
                      <Controller
                        name={`channels.${index}.optInLevel`}
                        control={control}
                        render={({ field: input }) => (
                          <Select
                            {...input}
                            options={Object.values(CustomerConsentOptInLevel).map((item) => ({
                              value: item,
                              label: enumLabel(item),
                            }))}
                            style={{ width: "100%" }}
                          />
                        )}
                      />
                    </CustomerFormField>
                    <CustomerFormField
                      label="Contact point"
                      error={rowErrors?.contactPoint?.message}
                    >
                      <Controller
                        name={`channels.${index}.contactPoint`}
                        control={control}
                        render={({ field: input }) => (
                          <Input
                            {...input}
                            status={rowErrors?.contactPoint ? "error" : undefined}
                          />
                        )}
                      />
                    </CustomerFormField>
                  </div>
                )}
                {current?.state === CustomerConsentState.Invalid ? (
                  <Tag color="red" style={{ marginTop: 12 }}>
                    Existing state remains Invalid until an explicit transition is saved
                  </Tag>
                ) : null}
              </Paper>
            );
          })}
        </Flex>
      ) : null}
    </CustomerSectionModalFrame>
  );
}
