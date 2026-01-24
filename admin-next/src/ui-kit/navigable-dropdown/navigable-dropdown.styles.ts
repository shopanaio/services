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
  grid: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 6,
    padding: "8px 8px 4px",
  },
  tag: {
    "&&": {
      margin: 0,
      cursor: "pointer",
      userSelect: "none" as const,
    },
  },
}));
