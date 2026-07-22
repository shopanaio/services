"use client";

import { Button, Dropdown, Tag, Typography } from "antd";
import { createStyles } from "antd-style";
import {
  LuBadge as BrandOutlined,
  LuEllipsis as EllipsisOutlined,
  LuMapPin as MapPinOutlined,
  LuStore as StoreOutlined,
} from "react-icons/lu";
import type { ApiStore } from "@/graphql/types";
import { shopCountries } from "@/defs/localization";
import { Paper } from "@/ui-kit/paper";
import type { StoreSettingsSection } from "../modals";

const useStyles = createStyles(({ token }) => ({
  paper: {
    padding: 0,
    overflow: "hidden",
    borderRadius: token.borderRadiusLG,
  },
  header: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 50,
    padding: "5px 16px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  title: {
    lineHeight: "22px",
  },
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
  item: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    height: 64,
    margin: 0,
    padding: 12,
    color: token.colorText,
    font: "inherit",
    textAlign: "left",
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    cursor: "pointer",
    transition: `border-color ${token.motionDurationMid}, background ${token.motionDurationMid}, box-shadow ${token.motionDurationMid}`,
    "&:hover": {
      background: token.colorFillQuaternary,
      borderColor: token.colorBorder,
    },
    "&:focus-visible": {
      outline: `2px solid ${token.colorPrimaryBorder}`,
      outlineOffset: 2,
    },
  },
  icon: {
    flex: "0 0 auto",
    width: 20,
    height: 20,
  },
  copy: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  label: {
    overflow: "hidden",
    fontSize: 13,
    fontWeight: 600,
    lineHeight: "19px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  value: {
    overflow: "hidden",
    color: token.colorTextSecondary,
    fontSize: 12,
    lineHeight: "18px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  status: {
    flex: "0 0 auto",
    margin: 0,
    paddingInline: 8,
    border: 0,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: "20px",
  },
}));

interface StoreContactDetailsCardProps {
  store: ApiStore;
  onEdit: (section: StoreSettingsSection) => void;
}

export const StoreContactDetailsCard = ({
  store,
  onEdit,
}: StoreContactDetailsCardProps) => {
  const { styles } = useStyles();
  const details = store.contactDetails;
  const countryName =
    shopCountries.find(({ value }) => value === store.address?.countryCode)
      ?.name ?? store.address?.countryCode ?? "Not configured";
  const phone = details.phoneNumbers[0] ?? "No phone number";

  const menuItems = [
    {
      key: "contact",
      label: "Edit store profile",
      "data-testid": "store-settings-menu-contact",
      onClick: () => onEdit("contact"),
    },
    {
      key: "address",
      label: "Edit store address",
      "data-testid": "store-settings-menu-address",
      onClick: () => onEdit("address"),
    },
    {
      key: "brand",
      label: "Edit brand",
      "data-testid": "store-settings-menu-brand",
      onClick: () => onEdit("brand"),
    },
  ];

  return (
    <Paper className={styles.paper} data-testid="store-contact-details-card">
      <div className={styles.header}>
        <Typography.Text strong className={styles.title}>
          Store contact details
        </Typography.Text>
        <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={["click"]}>
          <Button
            aria-label="Store contact details actions"
            className={styles.menuButton}
            icon={<EllipsisOutlined />}
          />
        </Dropdown>
      </div>
      <div className={styles.body}>
        <button
          className={styles.item}
          data-testid="store-profile-settings-item"
          onClick={() => onEdit("contact")}
          type="button"
        >
          <StoreOutlined className={styles.icon} />
          <span className={styles.copy}>
            <span className={styles.label}>
              {details.name} · {details.slug}
            </span>
            <span className={styles.value}>
              {details.email ?? "No email address"} · {phone}
            </span>
          </span>
          <Tag color={store.status === "ACTIVE" ? "green" : "default"} className={styles.status}>
            {store.status === "ACTIVE" ? "Active" : "Inactive"}
          </Tag>
        </button>
        <button
          className={styles.item}
          data-testid="store-address-settings-item"
          onClick={() => onEdit("address")}
          type="button"
        >
          <MapPinOutlined className={styles.icon} />
          <span className={styles.copy}>
            <span className={styles.label}>Store address</span>
            <span className={styles.value}>{countryName}</span>
          </span>
        </button>
        <button
          className={styles.item}
          data-testid="store-brand-settings-item"
          onClick={() => onEdit("brand")}
          type="button"
        >
          <BrandOutlined className={styles.icon} />
          <span className={styles.copy}>
            <span className={styles.label}>Brand</span>
            <span className={styles.value}>
              Logos, colors, cover, copy and social links
            </span>
          </span>
        </button>
      </div>
    </Paper>
  );
};
