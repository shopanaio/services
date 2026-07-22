"use client";

import { App, Button, Dropdown, Typography } from "antd";
import { createStyles } from "antd-style";
import { LuEllipsis, LuLanguages } from "react-icons/lu";
import type { ApiStore, LocaleCode } from "@/graphql/types";
import { Paper } from "@/ui-kit/paper";
import { getLanguageTag } from "../utils";

const useStyles = createStyles(({ token }) => ({
  paper: { padding: 0, overflow: "hidden" },
  header: {
    boxSizing: "border-box",
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
  body: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: "14px 16px",
  },
  row: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: 10,
    height: 64,
    padding: 12,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
  },
  icon: { flex: "0 0 auto", width: 20, height: 20 },
  copy: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  name: { fontSize: 13, fontWeight: 600, lineHeight: "19px" },
  code: { color: token.colorTextSecondary, fontSize: 12, lineHeight: "18px" },
  status: {
    padding: "3px 8px",
    color: token.colorTextSecondary,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: "18px",
    background: token.colorBgLayout,
    borderRadius: 10,
  },
  published: { color: token.colorSuccess, background: token.colorSuccessBg },
  rowAction: { width: 32, height: 32, padding: 0, borderColor: "transparent" },
}));

interface StoreLanguagesCardProps {
  store: ApiStore;
  loading: boolean;
  onAdd: () => void;
  onDelete: (code: LocaleCode) => Promise<void>;
  onSetDefault: (code: LocaleCode) => Promise<void>;
}

export const StoreLanguagesCard = ({
  store,
  loading,
  onAdd,
  onDelete,
  onSetDefault,
}: StoreLanguagesCardProps) => {
  const { styles, cx } = useStyles();
  const { modal } = App.useApp();

  return (
    <Paper className={styles.paper} data-testid="store-languages-card">
      <div className={styles.header}>
        <Typography.Text strong>Languages</Typography.Text>
        <Dropdown
          menu={{ items: [{ key: "add", label: "Add language", onClick: onAdd }] }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <Button
            aria-label="Language actions"
            className={styles.headerAction}
            icon={<LuEllipsis />}
          />
        </Dropdown>
      </div>
      <div className={styles.body}>
        {store.languageSettings.map((language) => {
          const isDefault = language.code === store.defaultLocale;
          return (
            <div className={styles.row} key={language.code}>
              <LuLanguages className={styles.icon} />
              <div className={styles.copy}>
                <span className={styles.name}>{language.name}</span>
                <span className={styles.code}>
                  {isDefault ? "Default · " : ""}{getLanguageTag(language.code)}
                </span>
              </div>
              <span className={cx(styles.status, language.isActive && styles.published)}>
                {language.isActive ? "Published" : "Draft"}
              </span>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: "default",
                      label: "Set as default",
                      disabled: isDefault,
                      onClick: () => void onSetDefault(language.code),
                    },
                    {
                      key: "delete",
                      label: "Delete language",
                      danger: true,
                      disabled: isDefault,
                      onClick: () =>
                        modal.confirm({
                          title: `Delete ${language.name}?`,
                          content: "Translated content will no longer be available in this language.",
                          okText: "Delete",
                          okButtonProps: { danger: true },
                          onOk: () => onDelete(language.code),
                        }),
                    },
                  ],
                }}
                placement="bottomRight"
                trigger={["click"]}
              >
                <Button
                  aria-label={`${language.name} actions`}
                  className={styles.rowAction}
                  disabled={loading}
                  icon={<LuEllipsis />}
                  type="text"
                />
              </Dropdown>
            </div>
          );
        })}
      </div>
    </Paper>
  );
};
