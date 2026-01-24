import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  panel: {
    background: token.colorBgElevated,
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadowSecondary,
    padding: 4,
    minWidth: 140,
  },
  back: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 12px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    borderRadius: token.borderRadiusSM,
    color: token.colorText,
    "&:hover": {
      background: token.colorBgTextHover,
    },
  },
  list: {
    padding: "4px 0",
    maxHeight: 240,
    overflowY: "auto" as const,
  },
  listItem: {
    padding: "5px 12px",
    cursor: "pointer",
    borderRadius: token.borderRadiusSM,
    margin: "0 4px",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    "&:hover": {
      background: token.colorBgTextHover,
    },
  },
}));
