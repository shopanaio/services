import { createStyles } from "antd-style";

export const useFacetCellStyles = createStyles(({ token }) => ({
  nameCell: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    minWidth: 0,
  },
  nameText: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    lineHeight: 1.25,
  },
  expandIcon: {
    cursor: "pointer",
    fontSize: 10,
    color: token.colorTextSecondary,
    width: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
    "&:hover": {
      color: token.colorText,
    },
  },
  expandIconPlaceholder: {
    width: 16,
    flex: "0 0 auto",
  },
  indent: {
    display: "inline-block",
    flex: "0 0 auto",
  },
  facetIcon: {
    color: token.colorPrimary,
    fontSize: 14,
    flex: "0 0 auto",
  },
  valueIcon: {
    color: token.colorSuccess,
    fontSize: 14,
    flex: "0 0 auto",
  },
  secondary: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  actionsCell: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  linkedCell: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  controlsCell: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  swatchCell: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  swatchDot: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: `1px solid ${token.colorBorder}`,
    flex: "0 0 auto",
  },
  swatchImage: {
    width: 22,
    height: 22,
    objectFit: "cover",
    borderRadius: 4,
    border: `1px solid ${token.colorBorder}`,
  },
}));
