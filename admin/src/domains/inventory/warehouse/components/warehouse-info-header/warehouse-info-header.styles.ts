import { createStyles } from "antd-style";

export const useWarehouseInfoHeaderStyles = createStyles(({ token }) => ({
  statusTag: {
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontWeight: 500,
  },
  metaText: {
    fontSize: token.fontSizeSM,
  },
  warehouseTitle: {},
  divider: {
    marginBlock: token.margin,
  },
  kpiTile: {
    padding: "12px 16px",
    background: token.colorBgElevated,
  },
}));
