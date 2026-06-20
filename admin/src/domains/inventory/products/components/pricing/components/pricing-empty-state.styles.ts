import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  emptyState: {
    minHeight: 204,
    padding: "28px 20px",
    borderRadius: 8,
    border: `1px dashed ${token.colorBorder}`,
    background: token.colorFillAlter,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    textAlign: "center",
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: token.colorPrimaryBg,
    color: token.colorPrimary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: token.fontSizeXL,
  },
  emptyContent: {
    maxWidth: 360,
  },
  emptyTitle: {
    "&&": {
      margin: 0,
      marginBottom: 4,
      fontSize: token.fontSizeLG,
    },
  },
  emptyText: {
    "&&": {
      display: "block",
      fontSize: token.fontSize,
    },
  },
}));
