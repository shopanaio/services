"use client";

import { Button, Dropdown, Typography } from "antd";
import { createStyles } from "antd-style";
import { FaFacebookF } from "react-icons/fa";
import { LuEllipsis, LuLockKeyhole, LuMail, LuMessageSquare } from "react-icons/lu";
import { FcGoogle } from "react-icons/fc";
import { Paper } from "@/ui-kit/paper";
import type { CustomerAuthenticationMethod } from "../types";

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
  title: { lineHeight: "22px" },
  menuButton: { width: 32, height: 32, padding: 0 },
  body: { display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px" },
  tiles: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
    gap: 12,
  },
  tile: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: 10,
    height: 64,
    padding: 12,
    color: token.colorText,
    font: "inherit",
    textAlign: "left",
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    cursor: "pointer",
    "&:hover": { background: token.colorFillQuaternary, borderColor: token.colorBorder },
    "&:focus-visible": { outline: `2px solid ${token.colorPrimaryBorder}`, outlineOffset: 2 },
  },
  methodIcon: { flex: "0 0 auto", width: 20, height: 20 },
  copy: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  label: { fontSize: 13, fontWeight: 600, lineHeight: "19px" },
  value: { color: token.colorTextSecondary, fontSize: 12, lineHeight: "18px" },
  providers: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 50,
    padding: "8px 12px",
    background: token.colorFillQuaternary,
    borderRadius: token.borderRadiusLG,
  },
  providerLabel: { fontSize: 12, fontWeight: 600, lineHeight: "18px" },
  providerList: { display: "flex", alignItems: "center", gap: 8 },
  providerChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 24,
    padding: "0 8px",
    fontSize: 12,
    lineHeight: "22px",
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: 6,
  },
  facebook: { color: "#1877f2", fontSize: 14 },
}));

const methods = {
  password: { label: "Password", description: "Email and password", Icon: LuLockKeyhole },
  "email-code": { label: "Email code", description: "One-time code", Icon: LuMail },
  "sms-code": { label: "SMS code", description: "One-time code", Icon: LuMessageSquare },
} satisfies Record<CustomerAuthenticationMethod, { label: string; description: string; Icon: typeof LuMail }>;

interface CustomerAccountsCardProps {
  enabledMethods: CustomerAuthenticationMethod[];
  onEdit: () => void;
}

export const CustomerAccountsCard = ({ enabledMethods, onEdit }: CustomerAccountsCardProps) => {
  const { styles } = useStyles();

  return (
    <Paper className={styles.paper} data-testid="customer-accounts-card">
      <div className={styles.header}>
        <Typography.Text strong className={styles.title}>Customer accounts</Typography.Text>
        <Dropdown
          menu={{ items: [{ key: "edit", label: "Edit customer accounts", onClick: onEdit }] }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <Button aria-label="Customer accounts actions" className={styles.menuButton} icon={<LuEllipsis />} />
        </Dropdown>
      </div>
      <div className={styles.body}>
        <div className={styles.tiles}>
          {enabledMethods.map((method) => {
            const { Icon, label, description } = methods[method];
            return (
              <button className={styles.tile} key={method} onClick={onEdit} type="button">
                <Icon className={styles.methodIcon} />
                <span className={styles.copy}>
                  <span className={styles.label}>{label}</span>
                  <span className={styles.value}>{description}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className={styles.providers}>
          <span className={styles.providerLabel}>Connected providers</span>
          <div className={styles.providerList}>
            <span className={styles.providerChip}><FcGoogle />Google</span>
            <span className={styles.providerChip}><FaFacebookF className={styles.facebook} />Facebook</span>
          </div>
        </div>
      </div>
    </Paper>
  );
};
