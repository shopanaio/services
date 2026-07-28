"use client";

import { App, Button, Dropdown } from "antd";
import { createStyles } from "antd-style";
import { LuEllipsis, LuLanguages } from "react-icons/lu";
import type { ApiStore, LocaleCode } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { SettingsItemTile } from "@/ui-kit/settings-item-tile";
import { getLanguageTag } from "../utils";

const useStyles = createStyles(({ token }) => ({
  paper: { padding: 0, overflow: "hidden" },
  menuButton: {
    width: 32,
    height: 32,
    padding: 0,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: "14px 16px",
  },
  status: {
    padding: "3px 8px",
    color: token.colorTextSecondary,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: "18px",
    background: token.colorBgLayout,
    borderRadius: 10,
  },
  rowActions: { display: "flex", alignItems: "center", gap: 4 },
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
  const { styles } = useStyles();
  const { modal } = App.useApp();

  return (
    <Paper className={styles.paper} data-testid="store-languages-card">
      <PaperHeader
        actions={
          <Dropdown
            menu={{ items: [{ key: "add", label: "Add language", onClick: onAdd }] }}
            placement="bottomRight"
            trigger={["click"]}
          >
            <Button
              aria-label="Language actions"
              className={styles.menuButton}
              icon={<LuEllipsis />}
            />
          </Dropdown>
        }
        contained
        title="Languages"
      />
      <div className={styles.body}>
        {[...store.languageSettings]
          .sort(
            (a, b) =>
              Number(b.code === store.defaultLocale) - Number(a.code === store.defaultLocale),
          )
          .map((language) => {
            const isDefault = language.code === store.defaultLocale;
            return (
              <SettingsItemTile
                icon={<LuLanguages />}
                key={language.code}
                label={language.name}
                trailing={
                  <span className={styles.rowActions}>
                    {isDefault ? <span className={styles.status}>Default</span> : null}
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
                  </span>
                }
                value={getLanguageTag(language.code)}
              />
            );
          })}
      </div>
    </Paper>
  );
};
