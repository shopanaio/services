import { createStyles } from "antd-style";

export const useCustomerDetailsStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
  },
  headerMeta: {
    minWidth: 0,
    flexWrap: "wrap",
  },
  statusTag: {
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontWeight: 600,
  },
  metaText: {
    fontSize: token.fontSizeSM,
  },
  headerActions: {
    flexShrink: 0,
  },
  iconButton: {
    paddingInline: 6,
  },
  identity: {
    minWidth: 0,
  },
  avatar: {
    flexShrink: 0,
    background: token.colorPrimaryBg,
    color: token.colorPrimary,
    fontWeight: 600,
  },
  customerTitle: {
    margin: 0,
    minWidth: 0,
  },
  contactLine: {
    minWidth: 0,
    rowGap: 4,
  },
  contact: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  verificationIcon: {
    display: "inline-flex",
    flexShrink: 0,
  },
  divider: {
    marginBlock: token.margin,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: token.marginSM,
    "@media (max-width: 720px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "@media (max-width: 420px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  kpiTile: {
    minWidth: 0,
  },
  subsectionLabel: {
    display: "block",
    color: token.colorTextSecondary,
    marginBottom: token.marginXS,
  },
  primaryValue: {
    display: "block",
    fontSize: token.fontSizeLG,
    fontWeight: 600,
  },
  sectionDivider: {
    marginBlock: token.margin,
  },
  twoColumns: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: token.marginXL,
    "@media (max-width: 720px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      gap: token.margin,
    },
  },
  metricRows: {
    display: "grid",
    gap: token.marginXS,
  },
  metricRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: token.margin,
  },
  detailRows: {
    display: "grid",
  },
  detailRow: {
    display: "grid",
    gridTemplateColumns: "140px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: token.margin,
    paddingBlock: token.paddingSM,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    "&:last-child": { borderBottom: 0, paddingBottom: 0 },
    "@media (max-width: 560px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      gap: token.marginXXS,
    },
  },
  addressGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: token.marginSM,
    "@media (max-width: 720px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  addressCard: {
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    padding: token.padding,
    minWidth: 0,
  },
  addressText: {
    whiteSpace: "pre-line",
  },
  showAll: {
    marginTop: token.marginSM,
    paddingInline: 0,
  },
  consentRow: {
    display: "grid",
    gridTemplateColumns: "40px minmax(0, 1fr)",
    gap: token.margin,
    paddingBlock: token.paddingSM,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    "&:last-child": { borderBottom: 0, paddingBottom: 0 },
  },
  channelIcon: {
    width: 40,
    height: 40,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    display: "grid",
    placeItems: "center",
    color: token.colorTextSecondary,
    fontSize: token.fontSizeLG,
  },
  classificationRow: {
    display: "grid",
    gridTemplateColumns: "110px minmax(0, 1fr)",
    gap: token.margin,
    paddingBlock: token.paddingSM,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    "&:last-child": { borderBottom: 0, paddingBottom: 0 },
    "@media (max-width: 520px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      gap: token.marginXXS,
    },
  },
  taxRow: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    alignItems: "center",
    gap: token.marginSM,
    paddingBlock: token.paddingSM,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    "&:last-child": { borderBottom: 0 },
    "@media (max-width: 620px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      alignItems: "start",
    },
  },
  statusStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    border: `1px solid ${token.colorBorder}`,
    borderRadius: token.borderRadiusLG,
    overflow: "hidden",
    "@media (max-width: 420px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  statusSegment: {
    padding: token.paddingSM,
    textAlign: "center",
    borderRight: `1px solid ${token.colorBorder}`,
    "&:last-child": { borderRight: 0 },
    "@media (max-width: 420px)": {
      borderRight: 0,
      borderBottom: `1px solid ${token.colorBorder}`,
      "&:last-child": { borderBottom: 0 },
    },
  },
  statusSegmentActive: {
    fontWeight: 600,
  },
  statusSegmentSuccess: {
    background: token.colorSuccessBg,
    color: token.colorSuccessText,
  },
  statusSegmentDisabled: {
    background: token.colorFillSecondary,
    color: token.colorTextSecondary,
  },
  statusSegmentBlocked: {
    background: token.colorErrorBg,
    color: token.colorErrorText,
  },
  terminalPanel: {
    padding: token.padding,
    borderRadius: token.borderRadiusLG,
    background: token.colorFillTertiary,
  },
  noteBlock: {
    paddingTop: token.paddingSM,
  },
  truncated: {
    display: "block",
    marginTop: token.marginSM,
  },
}));
