import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  gridWrapper: {
    width: "100%",
    "& .ag-header-cell": {
      fontSize: 12,
      fontWeight: 500,
    },
    "& .ag-cell": {
      display: "flex",
      alignItems: "center",
    },
    "& .ag-cell-wrapper": {
      width: "100%",
      display: "flex",
      alignItems: "center",
    },
    "& .ag-row-drag": {
      cursor: "grab",
      color: token.colorTextQuaternary,
      "&:hover": {
        color: token.colorTextSecondary,
      },
    },
    "& .ag-row-dragging": {
      cursor: "grabbing",
    },
    "& .row-group": {
      fontWeight: 600,
      background: `${token.colorBgLayout} !important`,
    },
    "& .row-item": {
      background: `${token.colorBgContainer} !important`,
    },
    // Transparent resize handles (visible on hover), full height
    "& .ag-header-cell-resize": {
      opacity: 0,
      transition: "opacity 0.2s",
      height: "100%",
      top: 0,
      "&:hover": {
        opacity: 1,
      },
    },
  },
  nameCell: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
  },
  expandIcon: {
    cursor: "pointer",
    fontSize: 10,
    color: token.colorTextSecondary,
    width: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "&:hover": {
      color: token.colorText,
    },
  },
  expandIconPlaceholder: {
    width: 16,
  },
  groupIcon: {
    color: token.colorPrimary,
    fontSize: 14,
  },
  itemIcon: {
    color: token.colorSuccess,
    fontSize: 14,
  },
  productImage: {
    width: 28,
    height: 28,
    borderRadius: 4,
    objectFit: "cover",
    background: token.colorBgLayout,
    flexShrink: 0,
  },
  productInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    minWidth: 0,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.3,
  },
  variantTitle: {
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.3,
    color: token.colorTextSecondary,
  },
  actionsCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  indent: {
    display: "inline-block",
  },
}));
