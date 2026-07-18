import { createStyles } from "antd-style";

export const useDiscountDetailsCardStyles = createStyles(() => ({
  card: {
    width: "100%",
  },
}));

export const useDiscountSummaryStyles = createStyles(({ token }) => ({
  statusTag: {
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: token.marginXXS,
    fontWeight: token.fontWeightStrong,
  },
  metaText: {
    fontSize: token.fontSizeSM,
  },
  title: {
    "&&": {
      margin: 0,
      fontSize: token.fontSizeHeading3,
    },
  },
  chips: {
    flexWrap: "wrap",
  },
  identityChip: {
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: token.marginXXS,
    paddingInline: token.paddingXS,
    background: token.colorFillQuaternary,
    borderColor: token.colorBorder,
  },
  chipLabel: {
    fontSize: token.fontSizeSM,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
  chipValue: {
    fontSize: 11,
    fontWeight: token.fontWeightStrong,
  },
  divider: {
    marginBlock: token.marginSM,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: token.marginXS,
    "@media (max-width: 768px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "@media (max-width: 480px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  kpiTile: {
    minWidth: 0,
    padding: `${token.paddingSM}px ${token.padding}px`,
    borderRadius: token.borderRadiusLG,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorFillQuaternary,
  },
  kpiLabel: {
    display: "block",
    marginBottom: token.marginXXS,
    color: token.colorTextTertiary,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
  kpiValue: {
    "&&": {
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      fontSize: token.fontSizeXL,
      fontWeight: token.fontWeightStrong,
      lineHeight: 1.2,
    },
  },
  trend: {
    flexShrink: 0,
    fontSize: 10,
    fontWeight: token.fontWeightStrong,
  },
  trendPositive: {
    color: token.colorSuccess,
  },
  trendNeutral: {
    color: token.colorTextTertiary,
  },
}));
