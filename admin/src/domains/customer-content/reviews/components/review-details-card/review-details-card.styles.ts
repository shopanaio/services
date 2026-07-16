import { createStyles } from "antd-style";

export const useReviewDetailsStyles = createStyles(({ token }) => ({
  headerTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: token.marginSM,
  },
  headerMeta: {
    minWidth: 0,
  },
  statusTag: {
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontWeight: 500,
  },
  auditText: {
    fontSize: token.fontSizeSM,
  },
  actionButton: {
    paddingInline: token.paddingXS,
  },
  reviewTitle: {
    margin: "0 !important",
  },
  ratingLine: {
    "& .ant-rate": {
      fontSize: 20,
      whiteSpace: "nowrap",
    },
  },
  divider: {
    marginBlock: token.margin,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: token.marginSM,
    "@media (max-width: 640px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "@media (max-width: 420px)": {
      gridTemplateColumns: "1fr",
    },
  },
  reviewBody: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.7,
    marginBottom: token.margin,
  },
  disclosure: {
    padding: token.paddingSM,
    border: `1px solid ${token.colorInfoBorder}`,
    borderRadius: token.borderRadius,
    background: token.colorInfoBg,
    marginBottom: token.margin,
  },
  disclosureIcon: {
    color: token.colorInfo,
    fontSize: 18,
  },
  sectionMeta: {
    paddingTop: token.paddingSM,
    borderTop: `1px solid ${token.colorBorderSecondary}`,
  },
  statusStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    border: `1px solid ${token.colorBorder}`,
    borderRadius: token.borderRadius,
    overflow: "hidden",
  },
  statusSegment: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: token.marginXS,
    minHeight: 46,
    color: token.colorTextSecondary,
    borderRight: `1px solid ${token.colorBorder}`,
    "&:last-child": { borderRight: 0 },
  },
  statusSegmentActivePending: {
    color: token.colorWarningText,
    background: token.colorWarningBg,
    boxShadow: `inset 0 0 0 1px ${token.colorWarning}`,
  },
  statusSegmentActivePublished: {
    color: token.colorSuccessText,
    background: token.colorSuccessBg,
    boxShadow: `inset 0 0 0 1px ${token.colorSuccess}`,
  },
  statusSegmentActiveRejected: {
    color: token.colorErrorText,
    background: token.colorErrorBg,
    boxShadow: `inset 0 0 0 1px ${token.colorError}`,
  },
  noteBlock: {
    padding: token.paddingSM,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
  },
  verificationRow: {
    padding: token.paddingSM,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
  },
  reportsHeader: {
    paddingTop: token.paddingSM,
    borderTop: `1px solid ${token.colorBorderSecondary}`,
  },
  reportRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: token.marginSM,
    paddingBlock: token.paddingSM,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    "&:last-child": { borderBottom: 0 },
    "@media (max-width: 640px)": {
      gridTemplateColumns: "1fr",
    },
  },
  subjectSummary: {
    paddingBottom: token.paddingSM,
  },
  subjectIcon: {
    width: 44,
    height: 44,
    borderRadius: token.borderRadius,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: token.colorBgLayout,
    color: token.colorTextSecondary,
    fontSize: 20,
    flexShrink: 0,
  },
  orderGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: token.margin,
    paddingBlock: token.paddingSM,
    borderTop: `1px solid ${token.colorBorderSecondary}`,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    "@media (max-width: 640px)": {
      gridTemplateColumns: "1fr",
    },
  },
  ratingsGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(180px, 1fr) minmax(0, 2fr)",
    gap: token.margin,
    "@media (max-width: 640px)": {
      gridTemplateColumns: "1fr",
    },
  },
  overallRating: {
    padding: token.padding,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
    textAlign: "center",
  },
  overallValue: {
    fontSize: 42,
    fontWeight: 600,
    lineHeight: 1.1,
  },
  criteriaPanel: {
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
    overflow: "hidden",
  },
  criteriaHeader: {
    padding: token.paddingSM,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  criterionRow: {
    display: "grid",
    gridTemplateColumns: "minmax(100px, 1fr) minmax(100px, 1fr) 36px",
    alignItems: "center",
    gap: token.marginSM,
    padding: token.paddingSM,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    "&:last-child": { borderBottom: 0 },
  },
  criterionScale: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(10px, 1fr))",
    gap: 4,
  },
  criterionSegment: {
    height: 6,
    borderRadius: 999,
    background: token.colorFillSecondary,
  },
  criterionSegmentActive: {
    background: token.colorWarning,
  },
  mediaBadge: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: token.colorTextLightSolid,
    background: token.colorBgMask,
    boxShadow: token.boxShadowTertiary,
  },
  mediaBadgePublished: { color: token.colorSuccess },
  mediaBadgePending: { color: token.colorWarning },
  mediaBadgeRejected: { color: token.colorError },
  mediaFooter: {
    marginTop: token.margin,
    paddingTop: token.paddingSM,
    borderTop: `1px solid ${token.colorBorderSecondary}`,
  },
  replyRow: {
    paddingBlock: token.paddingSM,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    "&:last-child": { borderBottom: 0 },
  },
  replyBodyCollapsed: {
    display: "-webkit-box",
    WebkitLineClamp: 4,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  externalRow: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    gap: token.marginSM,
    alignItems: "flex-start",
    paddingBlock: token.paddingSM,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    "&:last-child": { borderBottom: 0 },
    "@media (max-width: 640px)": {
      gridTemplateColumns: "auto minmax(0, 1fr)",
    },
  },
  technicalCode: {
    margin: 0,
    padding: token.paddingSM,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
    background: token.colorBgLayout,
    overflowX: "auto",
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
    fontSize: token.fontSizeSM,
  },
}));
