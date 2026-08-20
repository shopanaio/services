"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Button, Switch, Typography } from "antd";
import { createStyles } from "antd-style";
import { FaFacebookF } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { LuLockKeyhole, LuMail, LuMessageSquare } from "react-icons/lu";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { SettingsItemTile } from "@/ui-kit/settings-item-tile";
import type { EditCustomerAccountsModalPayload } from "../../modals";
import { CustomerAuthenticationMethod, CustomerAuthenticationProvider } from "@/graphql/types";

const useStyles = createStyles(({ token }) => ({
  paper: { padding: 0, overflow: "hidden" },
  paperHeader: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 50,
    padding: "5px 16px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  body: { display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px 16px" },
  sectionLabel: { fontSize: 12, fontWeight: 600, lineHeight: "18px" },
  connectionsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 1,
  },
  connectionsHint: { color: token.colorTextTertiary, fontSize: 12, lineHeight: "18px" },
  facebook: { color: token.colorTextSecondary },
  connectButton: {
    height: 24,
    paddingInline: 8,
    background: token.colorBgLayout,
    border: 0,
    borderRadius: 10,
    boxShadow: "none",
    fontSize: 12,
    fontWeight: 600,
  },
}));

const methodRows = [
  {
    id: CustomerAuthenticationMethod.Password,
    label: "Email and password",
    description: "Customers sign in with their email address and password.",
    Icon: LuLockKeyhole,
  },
  {
    id: CustomerAuthenticationMethod.EmailOtp,
    label: "Email one-time code",
    description: "Customers receive a sign-in code by email.",
    Icon: LuMail,
  },
  {
    id: CustomerAuthenticationMethod.PhoneOtp,
    label: "Phone one-time code",
    description: "Customers receive a sign-in code by text message.",
    Icon: LuMessageSquare,
  },
] satisfies Array<{
  id: CustomerAuthenticationMethod;
  label: string;
  description: string;
  Icon: typeof LuMail;
}>;

const sameMethods = (a: CustomerAuthenticationMethod[], b: CustomerAuthenticationMethod[]) =>
  a.length === b.length && a.every((method) => b.includes(method));

export const CustomerAccountsModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as EditCustomerAccountsModalPayload;
  const initialMethods = useMemo(
    () =>
      typedPayload.settings.methods.filter(({ enabled }) => enabled).map(({ method }) => method),
    [typedPayload.settings.methods],
  );
  const [enabledMethods, setEnabledMethods] =
    useState<CustomerAuthenticationMethod[]>(initialMethods);
  const [saving, setSaving] = useState(false);
  const isDirty = useMemo(
    () => !sameMethods(enabledMethods, initialMethods),
    [enabledMethods, initialMethods],
  );

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const toggle = (method: CustomerAuthenticationMethod, checked: boolean) => {
    setEnabledMethods((current) => {
      if (checked) return current.includes(method) ? current : [...current, method];
      return current.filter((item) => item !== method);
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const userErrors = await typedPayload.onSave({
        enabledMethods,
        expectedRevision: typedPayload.settings.revision,
      });
      if (userErrors.length > 0) {
        message.error(userErrors.map(({ message: errorMessage }) => errorMessage).join("\n"));
        return;
      }
      message.success("Customer accounts updated");
      forcePop();
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "Customer accounts could not be updated",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalLayout
      name="customer-accounts"
      header={
        <ModalHeader
          name="customer-accounts"
          onClose={pop}
          submitButtonProps={{
            children: "Save changes",
            disabled: !isDirty,
            loading: saving,
            onClick: save,
          }}
          title="Edit customer accounts"
        />
      }
    >
      <Paper className={styles.paper}>
        <div className={styles.paperHeader}>
          <Typography.Text strong>Customer accounts</Typography.Text>
        </div>
        <div className={styles.body}>
          <span className={styles.sectionLabel}>Authentication</span>
          {methodRows.map(({ id, label, description, Icon }) => {
            const checked = enabledMethods.includes(id);
            const configured =
              typedPayload.settings.methods.find(({ method }) => method === id)?.configured ??
              false;
            const unavailableDescription =
              id === CustomerAuthenticationMethod.PhoneOtp
                ? `${description} Phone one-time code is not available yet.`
                : `${description} Email delivery must be configured first.`;
            return (
              <SettingsItemTile
                ariaLabel={`Toggle ${label}`}
                icon={<Icon />}
                key={id}
                onClick={() => configured && toggle(id, !checked)}
                label={label}
                trailing={
                  <Switch
                    aria-label={label}
                    checked={checked}
                    disabled={!configured}
                    onClick={(_, event) => event.stopPropagation()}
                    onChange={(next) => toggle(id, next)}
                    size="small"
                  />
                }
                value={configured ? description : unavailableDescription}
              />
            );
          })}
          <div className={styles.connectionsHeader}>
            <span className={styles.sectionLabel}>Available connections</span>
            <span className={styles.connectionsHint}>Social and identity providers</span>
          </div>
          {typedPayload.settings.providers.map(({ provider, configured, enabled }) => (
            <SettingsItemTile
              icon={
                provider === CustomerAuthenticationProvider.Google ? (
                  <FcGoogle />
                ) : (
                  <FaFacebookF className={styles.facebook} />
                )
              }
              key={provider}
              label={provider === CustomerAuthenticationProvider.Google ? "Google" : "Facebook"}
              trailing={
                <Button className={styles.connectButton} disabled size="small" type="text">
                  {configured ? (enabled ? "Connected" : "Disabled") : "Connect"}
                </Button>
              }
              value="Social sign-in"
            />
          ))}
        </div>
      </Paper>
    </ModalLayout>
  );
};
