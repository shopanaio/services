"use client";

import { Button, Dropdown, Typography } from "antd";
import { createStyles } from "antd-style";
import {
  LuArchive,
  LuBadgeCheck,
  LuEllipsis,
  LuHash,
  LuZap,
} from "react-icons/lu";
import { AutomaticFulfillmentMode, type ApiStore } from "@/graphql/types";
import { Paper } from "@/ui-kit/paper";

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
  menuButton: { width: 32, height: 32, padding: 0 },
  body: { display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px" },
  automationGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    "@media (max-width: 760px)": { gridTemplateColumns: "1fr" },
  },
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
    "&:hover": { background: token.colorFillQuaternary, borderColor: token.colorBorder },
    "&:focus-visible": { outline: `2px solid ${token.colorPrimaryBorder}`, outlineOffset: 2 },
  },
  icon: { flex: "0 0 auto", width: 20, height: 20 },
  copy: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  label: { overflow: "hidden", fontSize: 13, fontWeight: 600, lineHeight: "19px", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  value: { overflow: "hidden", color: token.colorTextSecondary, fontSize: 12, lineHeight: "18px", textOverflow: "ellipsis", whiteSpace: "nowrap" },
}));

const fulfillmentLabels: Record<AutomaticFulfillmentMode, string> = {
  [AutomaticFulfillmentMode.AllLineItems]: "All line items",
  [AutomaticFulfillmentMode.GiftCardsOnly]: "Gift cards only",
  [AutomaticFulfillmentMode.Disabled]: "None",
};

interface StoreOrderProcessingCardProps {
  store: ApiStore;
  onEdit: () => void;
}

export const StoreOrderProcessingCard = ({ store, onEdit }: StoreOrderProcessingCardProps) => {
  const { styles } = useStyles();
  const settings = store.orderProcessing;
  const orderIdPreview = `${settings.orderNumberPrefix}1001${settings.orderNumberSuffix ?? ""}`;

  const tile = (Icon: typeof LuHash, label: string, value: string) => (
    <button className={styles.tile} onClick={onEdit} type="button">
      <Icon className={styles.icon} />
      <span className={styles.copy}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
      </span>
    </button>
  );

  return (
    <Paper className={styles.paper} data-testid="store-order-processing-card">
      <div className={styles.header}>
        <Typography.Text strong>Order processing</Typography.Text>
        <Dropdown
          menu={{ items: [{ key: "edit", label: "Edit order processing", onClick: onEdit }] }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <Button aria-label="Order processing actions" className={styles.menuButton} icon={<LuEllipsis />} />
        </Dropdown>
      </div>
      <div className={styles.body}>
        {tile(LuHash, "Order ID preview", orderIdPreview)}
        <div className={styles.automationGrid}>
          {tile(LuBadgeCheck, "Checkout confirmation", settings.requireCheckoutConfirmation ? "Required" : "Not required")}
          {tile(LuZap, "Automatic fulfillment", fulfillmentLabels[settings.automaticFulfillmentMode])}
          {tile(LuArchive, "Automatic archive", settings.automaticallyArchiveOrders ? "After fulfillment or refund" : "Disabled")}
        </div>
      </div>
    </Paper>
  );
};
