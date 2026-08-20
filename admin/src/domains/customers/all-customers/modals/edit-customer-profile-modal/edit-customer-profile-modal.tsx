"use client";

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Select } from "antd";
import { shopLocales } from "@/defs/localization";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  cleanOptional,
  CustomerFormField,
  CustomerSectionModalFrame,
  customerProfileSchema,
  type CustomerProfileValues,
  useCustomerFormStyles,
  useCustomerSectionModal,
} from "../shared";

export function EditCustomerProfileModal() {
  const state = useCustomerSectionModal("Personal profile updated");
  const { styles } = useCustomerFormStyles();
  const initialized = useRef(false);
  const lastReload = useRef(-1);
  const form = useForm<CustomerProfileValues>({
    resolver: zodResolver(customerProfileSchema),
    defaultValues: {
      prefix: "",
      firstName: "",
      middleName: "",
      lastName: "",
      suffix: "",
      preferredLocale: "en",
      dateOfBirth: "",
      gender: "",
    },
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
    reset({
      prefix: state.customer.prefix ?? "",
      firstName: state.customer.firstName ?? "",
      middleName: state.customer.middleName ?? "",
      lastName: state.customer.lastName ?? "",
      suffix: state.customer.suffix ?? "",
      preferredLocale: state.customer.preferredLocale ?? "en",
      dateOfBirth: state.customer.dateOfBirth ?? "",
      gender: state.customer.gender ?? "",
    });
    initialized.current = true;
    lastReload.current = state.reloadVersion;
  }, [reset, state.customer, state.reloadVersion]);
  useEffect(() => state.setDirty(isDirty), [isDirty, state.setDirty]);

  const submit = handleSubmit(async (values) => {
    await state.save<CustomerProfileValues>(
      {
        profile: {
          prefix: cleanOptional(values.prefix),
          firstName: values.firstName.trim(),
          middleName: cleanOptional(values.middleName),
          lastName: values.lastName.trim(),
          suffix: cleanOptional(values.suffix),
          preferredLocale: values.preferredLocale,
          dateOfBirth: cleanOptional(values.dateOfBirth),
          gender: cleanOptional(values.gender),
        },
      },
      {
        "profile.prefix": "prefix",
        "profile.firstName": "firstName",
        "profile.middleName": "middleName",
        "profile.lastName": "lastName",
        "profile.suffix": "suffix",
        "profile.preferredLocale": "preferredLocale",
        "profile.dateOfBirth": "dateOfBirth",
        "profile.gender": "gender",
      },
      setError,
    );
  });

  return (
    <CustomerSectionModalFrame
      name="customer-edit-profile"
      title="Edit personal profile"
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
        <>
          <Paper>
            <PaperHeader title="Name" />
            <div className={styles.threeColumns}>
              <CustomerFormField label="Prefix" error={errors.prefix?.message}>
                <Controller
                  name="prefix"
                  control={control}
                  render={({ field }) => <Input {...field} />}
                />
              </CustomerFormField>
              <CustomerFormField label="First name *" error={errors.firstName?.message}>
                <Controller
                  name="firstName"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} autoFocus status={errors.firstName ? "error" : undefined} />
                  )}
                />
              </CustomerFormField>
              <CustomerFormField label="Middle name" error={errors.middleName?.message}>
                <Controller
                  name="middleName"
                  control={control}
                  render={({ field }) => <Input {...field} />}
                />
              </CustomerFormField>
              <CustomerFormField label="Last name *" error={errors.lastName?.message}>
                <Controller
                  name="lastName"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} status={errors.lastName ? "error" : undefined} />
                  )}
                />
              </CustomerFormField>
              <CustomerFormField label="Suffix" error={errors.suffix?.message}>
                <Controller
                  name="suffix"
                  control={control}
                  render={({ field }) => <Input {...field} />}
                />
              </CustomerFormField>
            </div>
          </Paper>
          <Paper>
            <PaperHeader title="Personal details" />
            <div className={styles.grid}>
              <CustomerFormField label="Preferred locale *" error={errors.preferredLocale?.message}>
                <Controller
                  name="preferredLocale"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      showSearch
                      optionFilterProp="label"
                      options={shopLocales.map((locale) => ({
                        value: locale.value,
                        label: `${locale.name} (${locale.value})`,
                      }))}
                      style={{ width: "100%" }}
                    />
                  )}
                />
              </CustomerFormField>
              <CustomerFormField label="Date of birth" error={errors.dateOfBirth?.message}>
                <Controller
                  name="dateOfBirth"
                  control={control}
                  render={({ field }) => <Input {...field} type="date" />}
                />
              </CustomerFormField>
              <CustomerFormField label="Gender" error={errors.gender?.message}>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => <Input {...field} />}
                />
              </CustomerFormField>
            </div>
          </Paper>
        </>
      ) : null}
    </CustomerSectionModalFrame>
  );
}
