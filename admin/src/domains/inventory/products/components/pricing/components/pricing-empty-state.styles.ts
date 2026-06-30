import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  emptyState: {
    minHeight: 128,
    padding: "16px 20px",
    borderRadius: 8,
    border: `1px dashed ${token.colorBorder}`,
    background: token.colorFillAlter,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    textAlign: "center",
  },
  emptyIcon: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: token.colorPrimaryBg,
    color: token.colorPrimary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: token.fontSizeLG,
  },
  emptyContent: {
    maxWidth: 360,
  },
  emptyTitle: {
    "&&": {
      margin: 0,
      marginBottom: 2,
      fontSize: token.fontSize,
    },
  },
  emptyText: {
    "&&": {
      display: "block",
      fontSize: token.fontSize,
    },
  },
}));
