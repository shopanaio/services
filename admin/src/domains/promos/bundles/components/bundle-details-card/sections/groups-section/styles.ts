import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  lanes: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
  },
  lane: {
    display: "flex",
    flexDirection: "column" as const,
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    overflow: "hidden",
    cursor: "pointer",
    transition: "border-color 0.2s",
    "&:hover": {
      borderColor: token.colorBorder,
    },
  },
  laneHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px 8px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  laneInfo: {
    flex: 1,
    minWidth: 0,
  },
  laneTitle: {
    fontSize: token.fontSize,
    fontWeight: 600,
    display: "block",
  },
  laneCount: {
    fontSize: 10,
    display: "block",
    marginTop: -2,
  },
  laneTags: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 4,
  },
  laneTag: {
    "&&": {
      fontSize: 10,
      lineHeight: "16px",
      padding: "0 4px",
      margin: 0,
      borderRadius: 3,
    },
  },
  laneBody: {
    flex: 1,
    padding: "6px 8px",
    maxHeight: 200,
    overflowY: "auto" as const,
  },
  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 4px",
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "block",
  },
  itemQty: {
    fontSize: 10,
    display: "block",
    marginTop: -4,
  },
  avatarPlaceholder: {
    "&&": {
      background: token.colorFillSecondary,
      color: token.colorTextQuaternary,
      fontSize: 10,
    },
  },
  itemTag: {
    "&&": {
      fontSize: 10,
      lineHeight: "16px",
      padding: "0 4px",
      margin: 0,
      borderRadius: 3,
      flexShrink: 0,
    },
  },
}));
