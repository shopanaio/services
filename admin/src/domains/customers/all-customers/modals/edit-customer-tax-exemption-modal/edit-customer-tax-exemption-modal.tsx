"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Flex, Input, Select, Typography } from "antd";
import { shopCountries } from "@/defs/localization";
import { CustomerTaxExemptionStatus } from "@/graphql/types";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { useMediaPicker } from "@/shared/components/entity-picker-modal";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { CustomerTaxExemptionItemModalPayload } from "../../modals";
import { enumLabel } from "../../components/customer-details-card/customer-details-utils";
import {
  CustomerFormField,
  customerTaxExemptionDraftSchema,
  type CustomerTaxExemptionDraft,
  useCustomerFormStyles,
} from "../shared";

export function EditCustomerTaxExemptionModal() {
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const value = payload as CustomerTaxExemptionItemModalPayload;
  const { styles } = useCustomerFormStyles();
  const form = useForm<CustomerTaxExemptionDraft>({
    resolver: zodResolver(customerTaxExemptionDraftSchema),
    defaultValues: value.item,
    mode: "onChange",
  });
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty, isValid },
  } = form;
  const certificate = watch("certificateFile");
  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);
  const mediaPicker = useMediaPicker({
    selectionMode: "single",
    maxSelection: 1,
    accept: "application/pdf,image/*",
    initialSelection: certificate ? [certificate.id] : [],
    onConfirm: (files) => {
      const file = files[0];
      if (file)
        setValue(
          "certificateFile",
          { id: file.id, originalName: file.originalName, url: file.url },
          { shouldDirty: true, shouldValidate: true },
        );
    },
  });
  const apply = handleSubmit((item) => {
    value.onApply(item);
    setDirty(false);
    forcePop();
  });
  return (
    <ModalLayout
      name="customer-edit-tax-exemption"
      header={
        <ModalHeader
          name="customer-edit-tax-exemption"
          title={value.title}
          onClose={pop}
          submitButtonProps={{
            children: "Apply",
            disabled: !isDirty || !isValid,
            onClick: () => void apply(),
          }}
        />
      }
    >
      <Paper>
        <PaperHeader title="Tax exemption" />
        <div className={styles.grid}>
          <CustomerFormField label="Code *" error={errors.code?.message}>
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <Input {...field} autoFocus status={errors.code ? "error" : undefined} />
              )}
            />
          </CustomerFormField>
          <CustomerFormField label="Country" error={errors.countryCode?.message}>
            <Controller
              name="countryCode"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={shopCountries.map((country) => ({
                    value: country.value,
                    label: `${country.name} (${country.value})`,
                  }))}
                  style={{ width: "100%" }}
                />
              )}
            />
          </CustomerFormField>
          <CustomerFormField label="Region code" error={errors.regionCode?.message}>
            <Controller
              name="regionCode"
              control={control}
              render={({ field }) => <Input {...field} />}
            />
          </CustomerFormField>
          <CustomerFormField label="Status *" error={errors.status?.message}>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={Object.values(CustomerTaxExemptionStatus).map((item) => ({
                    value: item,
                    label: enumLabel(item),
                  }))}
                  style={{ width: "100%" }}
                />
              )}
            />
          </CustomerFormField>
          <CustomerFormField label="Valid from" error={errors.validFrom?.message}>
            <Controller
              name="validFrom"
              control={control}
              render={({ field }) => <Input {...field} type="date" />}
            />
          </CustomerFormField>
          <CustomerFormField label="Valid to" error={errors.validTo?.message}>
            <Controller
              name="validTo"
              control={control}
              render={({ field }) => <Input {...field} type="date" />}
            />
          </CustomerFormField>
          <div className={styles.full}>
            <CustomerFormField label="Reason" error={errors.reason?.message}>
              <Controller
                name="reason"
                control={control}
                render={({ field }) => <Input.TextArea {...field} rows={4} />}
              />
            </CustomerFormField>
          </div>
          <div className={styles.full}>
            <CustomerFormField label="Certificate">
              <Flex align="center" gap="small" wrap="wrap">
                <Typography.Text>
                  {certificate?.originalName ?? "No certificate selected"}
                </Typography.Text>
                <Button onClick={mediaPicker.openPicker}>Select</Button>
                {certificate ? (
                  <Button
                    danger
                    onClick={() =>
                      setValue("certificateFile", null, { shouldDirty: true, shouldValidate: true })
                    }
                  >
                    Remove
                  </Button>
                ) : null}
              </Flex>
            </CustomerFormField>
          </div>
        </div>
      </Paper>
    </ModalLayout>
  );
}
