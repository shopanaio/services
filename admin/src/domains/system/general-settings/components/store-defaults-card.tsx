"use client";

import { Button, Dropdown, Typography } from "antd";
import { createStyles } from "antd-style";
import {
  LuClock3,
  LuEllipsis,
  LuSlidersHorizontal,
  LuWeight,
} from "react-icons/lu";
import type { ApiStore } from "@/graphql/types";
import { Paper } from "@/ui-kit/paper";
import { SettingsItemTile } from "@/ui-kit/settings-item-tile";
import {
  formatTimeZoneLabel,
  UNIT_SYSTEM_LABELS,
  WEIGHT_UNIT_LABELS,
} from "../utils";

const useStyles = createStyles(({ token }) => ({
  paper: {
    padding: 0,
    overflow: "hidden",
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
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    padding: "14px 16px",
    "@media (max-width: 760px)": {
      gridTemplateColumns: "1fr",
    },
  },
}));

interface StoreDefaultsCardProps {
  store: ApiStore;
  onEdit: () => void;
}

export const StoreDefaultsCard = ({ store, onEdit }: StoreDefaultsCardProps) => {
  const { styles } = useStyles();
  const defaults = store.defaults;
  const menuItems = [
    {
      key: "edit",
      label: "Edit store defaults",
      "data-testid": "store-defaults-menu-edit",
      onClick: onEdit,
    },
  ];
  const tiles = [
    {
      key: "unit-system",
      icon: <LuSlidersHorizontal />,
      label: "Unit system",
      value: UNIT_SYSTEM_LABELS[defaults.unitSystem],
    },
    {
      key: "weight-unit",
      icon: <LuWeight />,
      label: "Default weight unit",
      value: WEIGHT_UNIT_LABELS[defaults.defaultWeightUnit],
    },
    {
      key: "time-zone",
      icon: <LuClock3 />,
      label: "Time zone",
      value: formatTimeZoneLabel(defaults.timezone),
    },
  ];

  return (
    <Paper className={styles.paper} data-testid="store-defaults-card">
      <div className={styles.header}>
        <Typography.Text strong className={styles.title}>
          Store defaults
        </Typography.Text>
        <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={["click"]}>
          <Button
            aria-label="Store defaults actions"
            className={styles.menuButton}
            icon={<LuEllipsis />}
          />
        </Dropdown>
      </div>
      <div className={styles.body}>
        {tiles.map((tile) => (
          <SettingsItemTile
            ariaLabel={`Edit ${tile.label}`}
            icon={tile.icon}
            key={tile.key}
            label={tile.label}
            onClick={onEdit}
            value={tile.value}
          />
        ))}
      </div>
    </Paper>
  );
};
