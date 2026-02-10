import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  card: {
    padding: 16,
    minHeight: "auto",
  },
  headerSelect: {
    fontSize: 12,
  },
  twoColumn: {
    display: "flex",
    gap: 8,
    alignItems: "stretch",
    marginBottom: 8,
    "@media (max-width: 768px)": {
      flexDirection: "column",
    },
  },
  priceColumnWrapper: {
    flex: 1,
    minWidth: 0,
    display: "flex",
  },
  chartColumnWrapper: {
    flex: 1.5,
    minWidth: 0,
    display: "flex",
  },
  column: {
    padding: 12,
    background: token.colorBgContainer,
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    flex: 1,
    width: "100%",
  },
  sectionLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    display: "block",
    marginBottom: 8,
    color: token.colorTextSecondary,
    fontWeight: 500,
  },
  mainPrice: {
    "&&": {
      fontSize: 32,
      fontWeight: 700,
      whiteSpace: "nowrap",
    },
  },
  discountTag: {
    margin: 0,
    fontSize: 11,
    fontWeight: 600,
    background: token.colorBgContainerDisabled,
    color: token.colorText,
  },
  sourceTag: {
    margin: 0,
    cursor: "help",
  },
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
    "@media (max-width: 768px)": {
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
}));
