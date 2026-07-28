"use client";

import { Button, Dropdown } from "antd";
import { createStyles } from "antd-style";
import { LuCircleDollarSign, LuEllipsis } from "react-icons/lu";
import type { ApiStore } from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { SettingsItemTile } from "@/ui-kit/settings-item-tile";
import { formatCurrencyName, formatCurrencySymbol } from "../utils";

const useStyles = createStyles(({ token }) => ({
  paper: { padding: 0, overflow: "hidden" },
  menuButton: {
    width: 32,
    height: 32,
    padding: 0,
  },
  body: { padding: "14px 16px" },
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
      <PaperHeader
        actions={
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
        }
        contained
        title="Currency"
      />
      <div className={styles.body}>
        <SettingsItemTile
          ariaLabel="Edit currency"
          icon={<LuCircleDollarSign />}
          label="Currency display"
          onClick={onEdit}
          trailing={
            <span className={styles.badge}>
              {currencyCode} {formatCurrencySymbol(currencyCode)}
            </span>
          }
          value={formatCurrencyName(currencyCode)}
        />
      </div>
    </Paper>
  );
};
