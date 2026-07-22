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
import { SettingsItemTile } from "@/ui-kit/settings-item-tile";

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
    <SettingsItemTile
      ariaLabel={`Edit ${label}`}
      icon={<Icon />}
      label={label}
      onClick={onEdit}
      value={value}
    />
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
