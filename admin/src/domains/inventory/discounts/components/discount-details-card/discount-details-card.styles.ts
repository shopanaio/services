import { createStyles } from "antd-style";

export const useDiscountDetailsCardStyles = createStyles(() => ({
  card: {
    width: "100%",
  },
}));

export const useDiscountSummaryStyles = createStyles(({ token }) => ({
  header: {
    marginBottom: token.marginXS,
    paddingBottom: token.paddingXS,
  },
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
    marginBlock: token.marginXS,
  },
  summaryControls: {
    marginBottom: token.marginXS,
  },
  periodControl: {
    "&&": {
      fontSize: token.fontSizeSM,
    },
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

export const useDiscountSectionStyles = createStyles(({ token }) => ({
  section: {
    width: "100%",
  },
  compactHeader: {
    marginBottom: token.marginXS,
    paddingBottom: token.paddingXS,
  },
  headerAction: {
    color: token.colorTextSecondary,
  },
  muted: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  primaryIcon: {
    color: token.colorPrimary,
  },
  neutralIcon: {
    color: token.colorTextQuaternary,
  },
  channelIconActive: {
    display: "inline-flex",
    color: token.colorPrimary,
    fontSize: token.fontSizeLG,
  },
  channelIconInactive: {
    display: "inline-flex",
    color: token.colorTextQuaternary,
    fontSize: token.fontSizeLG,
  },
  eyebrow: {
    color: token.colorTextTertiary,
    fontSize: 10,
    fontWeight: token.fontWeightStrong,
    letterSpacing: "0.3px",
    textTransform: "uppercase",
  },
  primaryEyebrow: {
    color: token.colorPrimary,
  },
  detailList: {
    marginTop: token.marginXS,
  },
  valueTypeLabel: {
    "&&": {
      color: token.colorTextSecondary,
      fontSize: token.fontSize,
      fontWeight: 500,
    },
  },
  valueDetailRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) max-content",
    alignItems: "baseline",
    gap: token.marginSM,
  },
  valueDetailLabel: {
    minWidth: 0,
  },
  valueDetailValue: {
    textAlign: "end",
    whiteSpace: "nowrap",
  },
  discountMainValue: {
    "&&": {
      marginBlock: `${token.marginXS}px ${token.marginXXS}px`,
      lineHeight: 1.1,
    },
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: token.marginXS,
    marginTop: token.marginXS,
    "@media (max-width: 700px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "@media (max-width: 420px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  buyXTimeline: {
    "&&": {
      marginTop: token.marginXS,
      paddingInlineStart: token.paddingXS,
    },
    "&& .ant-timeline-item": {
      paddingBottom: token.padding,
    },
    "&& .ant-timeline-item:last-child": {
      paddingBottom: 0,
    },
    "&& .ant-timeline-item-content": {
      minHeight: 48,
      insetBlockStart: -5,
    },
  },
  scopeHeader: {
    marginBottom: token.marginXS,
  },
  entityList: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    overflow: "hidden",
  },
  targetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: token.marginXS,
    "@media (max-width: 640px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  entityRow: {
    minWidth: 0,
    padding: `${token.paddingXS}px ${token.paddingSM}px`,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorFillQuaternary,
  },
  listRow: {
    minWidth: 0,
    padding: `${token.paddingXS}px ${token.paddingSM}px`,
    background: token.colorBgContainer,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    "&:last-child": {
      borderBottom: 0,
    },
  },
  entityTitle: {
    minWidth: 0,
  },
  mono: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 11,
  },
  warningBox: {
    padding: token.paddingSM,
    border: `1px solid ${token.colorWarningBorder}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorWarningBg,
  },
  optionList: {
    display: "flex",
    flexDirection: "column",
    gap: token.marginXS,
  },
  option: {
    minWidth: 0,
    padding: `${token.paddingXS}px ${token.paddingSM}px`,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorFillQuaternary,
  },
  optionEnabled: {
    borderColor: token.colorPrimaryBorder,
    background: token.colorPrimaryBg,
  },
  caption: {
    display: "block",
    marginTop: token.marginXS,
    color: token.colorTextTertiary,
    fontSize: 11,
  },
  scheduleGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 0.9fr)",
    gap: token.marginXS,
    "@media (max-width: 560px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  availabilityTimeline: {
    "&&": {
      margin: 0,
      paddingTop: 2,
    },
    "&& .ant-timeline-item": {
      paddingBottom: token.paddingSM,
    },
    "&& .ant-timeline-item:last-child": {
      paddingBottom: 0,
    },
    "&& .ant-timeline-item-wrapper": {
      columnGap: token.marginSM,
    },
    "&& .ant-timeline-item-icon": {
      width: 10,
      minWidth: 10,
      flexBasis: 10,
      marginInlineStart: 0,
    },
    "&& .ant-timeline-item-content": {
      minHeight: 34,
      insetBlockStart: -5,
      marginInlineStart: 0,
    },
    "&& .ant-timeline-item-rail": {
      insetInlineStart: 5,
      top: 8,
      bottom: -8,
      borderInlineStartWidth: 1,
    },
  },
  policyCard: {
    padding: `${token.paddingXS}px ${token.paddingSM}px`,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorFillQuaternary,
  },
  codeRow: {
    padding: token.paddingXS,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorFillQuaternary,
  },
  codeRowContent: {
    display: "grid",
    gridTemplateColumns: "32px minmax(0, 1fr) max-content max-content",
    alignItems: "center",
    columnGap: 10,
    "@media (max-width: 640px)": {
      gridTemplateColumns: "32px minmax(0, 1fr)",
      rowGap: token.marginXS,
    },
  },
  codeDetails: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  codeMeta: {
    "&&": {
      fontSize: token.fontSizeSM,
      lineHeight: "18px",
    },
  },
  codeList: {
    display: "flex",
    flexDirection: "column",
    gap: token.marginXS,
  },
  codeUsage: {
    flexShrink: 0,
    textAlign: "end",
    whiteSpace: "nowrap",
    "@media (max-width: 640px)": {
      gridColumn: 2,
      alignItems: "flex-start",
      textAlign: "start",
    },
  },
  codeStatuses: {
    "& > .ant-tag": {
      marginInlineEnd: 0,
      paddingInline: 7,
      fontSize: token.fontSizeSM,
      lineHeight: "16px",
    },
    "@media (max-width: 640px)": {
      gridColumn: 2,
      justifyContent: "flex-start",
    },
  },
  codeValue: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontWeight: token.fontWeightStrong,
    lineHeight: "20px",
  },
  codeUsagePrimary: {
    "&&": {
      fontSize: token.fontSizeSM,
      lineHeight: "18px",
    },
  },
  codeUsageSecondary: {
    "&&": {
      fontSize: token.fontSizeSM,
      lineHeight: "18px",
    },
  },
  externalLink: {
    minWidth: 0,
  },
  externalRowWarning: {
    borderColor: token.colorWarningBorder,
    background: token.colorWarningBg,
    boxShadow: `inset 0 0 0 1px ${token.colorWarningBorder}`,
  },
  inlineEmpty: {
    minHeight: 52,
    padding: token.paddingSM,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorFillQuaternary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: token.marginXS,
    color: token.colorTextTertiary,
    textAlign: "center",
  },
}));
