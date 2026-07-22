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
    transition: `border-color ${token.motionDurationMid}, background ${token.motionDurationMid}`,
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
      icon: <LuSlidersHorizontal className={styles.icon} />,
      label: "Unit system",
      value: UNIT_SYSTEM_LABELS[defaults.unitSystem],
    },
    {
      key: "weight-unit",
      icon: <LuWeight className={styles.icon} />,
      label: "Default weight unit",
      value: WEIGHT_UNIT_LABELS[defaults.defaultWeightUnit],
    },
    {
      key: "time-zone",
      icon: <LuClock3 className={styles.icon} />,
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
          <button className={styles.tile} key={tile.key} onClick={onEdit} type="button">
            {tile.icon}
            <span className={styles.copy}>
              <span className={styles.label}>{tile.label}</span>
              <span className={styles.value}>{tile.value}</span>
            </span>
          </button>
        ))}
      </div>
    </Paper>
  );
};
