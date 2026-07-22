"use client";

import { Button, Dropdown, Typography } from "antd";
import { createStyles } from "antd-style";
import { LuCircleDollarSign, LuEllipsis } from "react-icons/lu";
import type { ApiStore } from "@/graphql/types";
import { Paper } from "@/ui-kit/paper";
import { formatCurrencyName, formatCurrencySymbol } from "../utils";

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
  menuButton: {
    width: 32,
    height: 32,
    padding: 0,
    background: token.colorBgContainerDisabled,
  },
  body: { padding: "14px 16px" },
  tile: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    height: 64,
    padding: 12,
    color: token.colorText,
    font: "inherit",
    textAlign: "left",
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    cursor: "pointer",
    "&:hover": {
      background: token.colorFillQuaternary,
      borderColor: token.colorBorder,
    },
    "&:focus-visible": {
      outline: `2px solid ${token.colorPrimaryBorder}`,
      outlineOffset: 2,
    },
  },
  icon: { flex: "0 0 auto", width: 20, height: 20 },
  copy: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  label: { fontSize: 13, fontWeight: 600, lineHeight: "19px" },
  value: { color: token.colorTextSecondary, fontSize: 12, lineHeight: "18px" },
  badge: {
    flex: "0 0 auto",
    padding: "3px 8px",
    color: token.colorTextSecondary,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: "18px",
    background: token.colorBgLayout,
    borderRadius: 10,
  },
}));

interface StoreCurrencyCardProps {
  store: ApiStore;
  onEdit: () => void;
}

export const StoreCurrencyCard = ({ store, onEdit }: StoreCurrencyCardProps) => {
  const { styles } = useStyles();
  const { currencyCode } = store.currencySettings;

  return (
    <Paper className={styles.paper} data-testid="store-currency-card">
      <div className={styles.header}>
        <Typography.Text strong>Currency</Typography.Text>
        <Dropdown
          menu={{
            items: [{ key: "edit", label: "Edit currency", onClick: onEdit }],
          }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <Button
            aria-label="Currency actions"
            className={styles.menuButton}
            icon={<LuEllipsis />}
          />
        </Dropdown>
      </div>
      <div className={styles.body}>
        <button className={styles.tile} onClick={onEdit} type="button">
          <LuCircleDollarSign className={styles.icon} />
          <span className={styles.copy}>
            <span className={styles.label}>Currency display</span>
            <span className={styles.value}>{formatCurrencyName(currencyCode)}</span>
          </span>
          <span className={styles.badge}>
            {currencyCode} {formatCurrencySymbol(currencyCode)}
          </span>
        </button>
      </div>
    </Paper>
  );
};
