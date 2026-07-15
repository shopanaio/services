"use client";

import type { LocaleCode } from "@/graphql/types";
import { allowedLocales, shopLocales } from "@/defs/localization";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { Alert, App, Select } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useAddLocale, useGeneralSettings } from "../../hooks";
import type { AddLanguageModalPayload } from "../../modals";

export const AddLanguageModal = () => {
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as AddLanguageModalPayload;
  const { locales } = useGeneralSettings();
  const mutation = useAddLocale();
  const [selectedLocale, setSelectedLocale] = useState<LocaleCode | null>(null);
  const existingLocales = useMemo(
    () => new Set(locales.map((locale) => locale.code)),
    [locales],
  );
  const options = useMemo(
    () =>
      shopLocales
        .filter(
          (locale) =>
            allowedLocales.includes(locale.value) &&
            !existingLocales.has(locale.value as LocaleCode),
        )
        .map((locale) => ({ label: locale.name, value: locale.value }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [existingLocales],
  );

  useEffect(
    () => setDirty(selectedLocale !== null),
    [selectedLocale, setDirty],
  );

  const submit = async () => {
    if (!selectedLocale) return;
    const selectedOption = options.find(
      (option) => option.value === selectedLocale,
    );
    if (!selectedOption) return;

    const result = await mutation.addLocale({
      code: selectedLocale,
      isActive: true,
    });
    if (!result.data) return;

    await typedPayload.onSaved?.();
    message.success("Language added");
    forcePop();
  };

  return (
    <ModalLayout
      name="add-language"
      header={
        <ModalHeader
          name="add-language"
          onClose={pop}
          submitButtonProps={{
            children: "Confirm",
            disabled: !selectedLocale,
            loading: mutation.loading,
            onClick: submit,
          }}
          title="Add language"
        />
      }
    >
      {mutation.error ? (
        <Alert message={mutation.error.message} showIcon type="error" />
      ) : null}
      <Paper>
        <Select
          data-testid="language-select"
          onChange={(value) => setSelectedLocale(value as LocaleCode)}
          options={options}
          placeholder="Select language"
          showSearch
          style={{ width: "100%" }}
          value={selectedLocale}
        />
      </Paper>
    </ModalLayout>
  );
};
