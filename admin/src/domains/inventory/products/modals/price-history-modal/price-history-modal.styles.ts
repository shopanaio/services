import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  variantSelect: {
    minWidth: 200,
    ".ant-select-selector": {
      fontSize: "13px !important",
    },
  },
  warningIcon: {
    color: token.colorWarning,
    fontSize: 10,
  },
  overviewPaper: {
    padding: 16,
  },
  currentPriceSection: {
    marginBottom: 16,
  },
  currentPriceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 12,
    flexWrap: "wrap",
  },
  mainPrice: {
    "&&": {
      fontSize: 28,
      fontWeight: 700,
      margin: 0,
      lineHeight: 1.2,
    },
  },
  compareAtPrice: {
    fontSize: 16,
  },
  chartSection: {
    marginBottom: 16,
  },
  chartHeader: {
    marginBottom: 12,
  },
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
    "@media (max-width: 600px)": {
      gridTemplateColumns: "repeat(2, 1fr)",
    },
  },
  kpiTile: {
    textAlign: "center",
    minHeight: 56,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  changeLogPaper: {
    padding: 16,
  },
  timelineContainer: {
    maxHeight: 400,
    overflowY: "auto",
  },
}));
