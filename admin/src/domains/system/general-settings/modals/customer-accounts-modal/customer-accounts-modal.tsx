"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Button, Switch, Typography } from "antd";
import { createStyles } from "antd-style";
import { FaFacebookF } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { LuEllipsis, LuLockKeyhole, LuMail, LuMessageSquare } from "react-icons/lu";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import type { EditCustomerAccountsModalPayload } from "../../modals";
import type { CustomerAuthenticationMethod } from "../../types";

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
  menuButton: { width: 32, height: 32, padding: 0 },
  body: { display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px 16px" },
  sectionLabel: { fontSize: 12, fontWeight: 600, lineHeight: "18px" },
  method: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    padding: "10px 12px",
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
  },
  icon: { flex: "0 0 auto", width: 20, height: 20 },
  copy: { display: "flex", flex: 1, flexDirection: "column", gap: 1, minWidth: 0 },
  label: { fontSize: 13, fontWeight: 600, lineHeight: "19px" },
  description: { color: token.colorTextSecondary, fontSize: 12, lineHeight: "18px" },
  connectionsHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 1 },
  connectionsHint: { color: token.colorTextTertiary, fontSize: 12, lineHeight: "18px" },
  providerIcon: { display: "grid", placeItems: "center", width: 20, height: 20, fontSize: 17 },
  facebook: { color: token.colorTextSecondary },
  connectButton: { border: 0, boxShadow: "none", fontWeight: 600 },
}));

const methodRows = [
  { id: "password", label: "Email and password", description: "Customers sign in with their email address and password.", Icon: LuLockKeyhole },
  { id: "email-code", label: "Email one-time code", description: "Customers receive a sign-in code by email.", Icon: LuMail },
  { id: "sms-code", label: "SMS one-time code", description: "Customers receive a sign-in code by text message.", Icon: LuMessageSquare },
] satisfies Array<{ id: CustomerAuthenticationMethod; label: string; description: string; Icon: typeof LuMail }>;

const sameMethods = (a: CustomerAuthenticationMethod[], b: CustomerAuthenticationMethod[]) =>
  a.length === b.length && a.every((method) => b.includes(method));

export const CustomerAccountsModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const typedPayload = payload as EditCustomerAccountsModalPayload;
  const [enabledMethods, setEnabledMethods] = useState<CustomerAuthenticationMethod[]>(
    typedPayload.enabledMethods.length > 0 ? typedPayload.enabledMethods : ["password"],
  );
  const isDirty = useMemo(
    () => !sameMethods(enabledMethods, typedPayload.enabledMethods),
    [enabledMethods, typedPayload.enabledMethods],
  );

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  const toggle = (method: CustomerAuthenticationMethod, checked: boolean) => {
    setEnabledMethods((current) => {
      if (checked) return current.includes(method) ? current : [...current, method];
      if (current.length === 1) return current;
      return current.filter((item) => item !== method);
    });
  };

  const save = () => {
    typedPayload.onSave(enabledMethods);
    message.success("Customer accounts updated");
    forcePop();
  };

  return (
    <ModalLayout
      name="customer-accounts"
      header={
        <ModalHeader
          name="customer-accounts"
          onClose={pop}
          submitButtonProps={{ children: "Save changes", disabled: !isDirty, onClick: save }}
          title="Edit customer accounts"
        />
      }
    >
      <Paper className={styles.paper}>
        <div className={styles.paperHeader}>
          <Typography.Text strong>Customer accounts</Typography.Text>
          <Button aria-label="Customer accounts options" className={styles.menuButton} disabled icon={<LuEllipsis />} />
        </div>
        <div className={styles.body}>
          <span className={styles.sectionLabel}>Authentication</span>
          {methodRows.map(({ id, label, description, Icon }) => {
            const checked = enabledMethods.includes(id);
            return (
              <div className={styles.method} key={id}>
                <Icon className={styles.icon} />
                <span className={styles.copy}>
                  <span className={styles.label}>{label}</span>
                  <span className={styles.description}>{description}</span>
                </span>
                <Switch
                  aria-label={label}
                  checked={checked}
                  disabled={checked && enabledMethods.length === 1}
                  onChange={(next) => toggle(id, next)}
                  size="small"
                />
              </div>
            );
          })}
          <div className={styles.connectionsHeader}>
            <span className={styles.sectionLabel}>Available connections</span>
            <span className={styles.connectionsHint}>Social and identity providers</span>
          </div>
          <div className={styles.method}>
            <span className={styles.providerIcon}><FcGoogle /></span>
            <span className={styles.copy}><span className={styles.label}>Google</span><span className={styles.description}>Social sign-in</span></span>
            <Button className={styles.connectButton} disabled size="small" type="text">Connect</Button>
          </div>
          <div className={styles.method}>
            <span className={`${styles.providerIcon} ${styles.facebook}`}><FaFacebookF /></span>
            <span className={styles.copy}><span className={styles.label}>Facebook</span><span className={styles.description}>Social sign-in</span></span>
            <Button className={styles.connectButton} disabled size="small" type="text">Connect</Button>
          </div>
        </div>
      </Paper>
    </ModalLayout>
  );
};
