"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Checkbox, Input, Typography } from "antd";
import { createStyles } from "antd-style";
import { LuEllipsis, LuSearch } from "react-icons/lu";
import { shopLocales } from "@/defs/localization";
import type { LocaleCode } from "@/graphql/types";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { useLanguageSettingsMutations } from "../../hooks";
import type { AddStoreLanguageModalPayload } from "../../modals";

const useStyles = createStyles(({ token }) => ({
  intro: { display: "flex", flexDirection: "column", gap: 2 },
  title: { fontSize: 24, fontWeight: 600, lineHeight: "32px" },
  description: { color: token.colorTextSecondary, fontSize: 13, lineHeight: "20px" },
  paper: { padding: 0, overflow: "hidden" },
  paperHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 50,
    padding: "5px 16px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  headerAction: {
    width: 32,
    height: 32,
    padding: 0,
    background: token.colorBgContainerDisabled,
  },
  search: { padding: "0 14px", marginTop: 0 },
  list: {
    maxHeight: 364,
    marginTop: 8,
    padding: "0 14px 0",
    overflowY: "auto",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    padding: "0 12px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    cursor: "pointer",
  },
  selected: { background: token.colorPrimaryBg },
  language: { fontSize: 14, lineHeight: "22px" },
  help: {
    color: token.colorTextSecondary,
    fontSize: 12,
    lineHeight: "18px",
  },
}));

export const StoreLanguageModal = () => {
  const { styles, cx } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as AddStoreLanguageModalPayload;
  const mutations = useLanguageSettingsMutations();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LocaleCode | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const configured = useMemo(
    () => new Set(typedPayload.store.languageSettings.map(({ code }) => code)),
    [typedPayload.store.languageSettings],
  );
  const languages = useMemo(
    () =>
      shopLocales
        .map(({ name, value }) => ({ name, code: value as LocaleCode }))
        .filter(({ code }) => !configured.has(code))
        .filter(({ name }) => name.toLowerCase().includes(query.trim().toLowerCase())),
    [configured, query],
  );

  useEffect(() => setDirty(selected !== null), [selected, setDirty]);

  const submit = async () => {
    if (!selected) return;
    setSubmitError(null);
    const result = await mutations.createLanguage(selected);
    if (!result.locale || result.userErrors.length > 0) {
      setSubmitError(
        result.userErrors.map(({ message: errorMessage }) => errorMessage).join("\n") ||
          mutations.error?.message ||
          "The language could not be added.",
      );
      return;
    }
    await typedPayload.onSaved?.();
    message.success(`${result.locale.name} added as draft`);
    forcePop();
  };

  return (
    <ModalLayout
      name="store-language"
      header={
        <ModalHeader
          name="store-language"
          onClose={pop}
          submitButtonProps={{
            children: "Continue",
            disabled: !selected,
            loading: mutations.creating,
            onClick: () => void submit(),
          }}
          title="Add language"
        />
      }
    >
      <div className={styles.intro}>
        <Typography.Text className={styles.title}>Add language</Typography.Text>
        <Typography.Text className={styles.description}>
          Choose a language, review its locale, and decide where customers can use it.
        </Typography.Text>
      </div>
      {submitError ? <Alert message={submitError} showIcon type="error" /> : null}
      <Paper className={styles.paper}>
        <div className={styles.paperHeader}>
          <Typography.Text strong>Language details</Typography.Text>
          <Button
            aria-label="Language details actions"
            className={styles.headerAction}
            icon={<LuEllipsis />}
          />
        </div>
        <div className={styles.search}>
          <Input
            allowClear
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search languages"
            prefix={<LuSearch />}
            value={query}
          />
        </div>
        <div aria-label="Available languages" className={styles.list} role="listbox">
          {languages.map(({ code, name }) => (
            <div
              className={cx(styles.row, selected === code && styles.selected)}
              key={code}
              onClick={() => setSelected(code)}
              role="option"
              aria-selected={selected === code}
            >
              <span className={styles.language}>{name}</span>
              <Checkbox
                checked={selected === code}
                onChange={() => setSelected(code)}
              />
            </div>
          ))}
        </div>
      </Paper>
      <span className={styles.help}>
        Content can be translated before the language becomes visible to customers.
      </span>
    </ModalLayout>
  );
};
