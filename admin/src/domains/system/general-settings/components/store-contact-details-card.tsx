"use client";

import { Button, Dropdown, Tag } from "antd";
import { createStyles } from "antd-style";
import {
  LuBadge as BrandOutlined,
  LuEllipsis as EllipsisOutlined,
  LuMapPin as MapPinOutlined,
  LuStore as StoreOutlined,
} from "react-icons/lu";
import type { ApiStore } from "@/graphql/types";
import { shopCountries } from "@/defs/localization";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { SettingsItemTile } from "@/ui-kit/settings-item-tile";
import type { StoreSettingsSection } from "../modals";

const useStyles = createStyles(({ token }) => ({
  paper: {
    padding: 0,
    overflow: "hidden",
    borderRadius: token.borderRadiusLG,
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
      <PaperHeader
        actions={
          <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={["click"]}>
            <Button
              aria-label="Store contact details actions"
              className={styles.menuButton}
              icon={<EllipsisOutlined />}
            />
          </Dropdown>
        }
        contained
        title="Store contact details"
      />
      <div className={styles.body}>
        <SettingsItemTile
          ariaLabel="Edit store profile"
          dataTestId="store-profile-settings-item"
          icon={<StoreOutlined />}
          label={`${details.name} · ${details.slug}`}
          onClick={() => onEdit("contact")}
          trailing={
            <Tag color={store.status === "ACTIVE" ? "green" : "default"} className={styles.status}>
              {store.status === "ACTIVE" ? "Active" : "Inactive"}
            </Tag>
          }
          value={`${details.email ?? "No email address"} · ${phone}`}
        />
        <SettingsItemTile
          ariaLabel="Edit store address"
          dataTestId="store-address-settings-item"
          icon={<MapPinOutlined />}
          label="Store address"
          onClick={() => onEdit("address")}
          value={countryName}
        />
        <SettingsItemTile
          ariaLabel="Edit brand"
          dataTestId="store-brand-settings-item"
          icon={<BrandOutlined />}
          label="Brand"
          onClick={() => onEdit("brand")}
          value="Logos, colors, cover, copy and social links"
        />
      </div>
    </Paper>
  );
};
