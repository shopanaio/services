import { createStyles } from "antd-style";

export const useReviewFormStyles = createStyles(({ token }) => ({
  field: {
    flex: 1,
    minWidth: 0,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: token.margin,
    "@media (max-width: 640px)": {
      gridTemplateColumns: "1fr",
    },
  },
  label: {
    display: "block",
    marginBottom: 4,
    fontSize: token.fontSize,
    fontWeight: 500,
  },
  error: {
    display: "block",
    color: token.colorError,
    fontSize: token.fontSizeSM,
    marginTop: 4,
  },
  help: {
    display: "block",
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    marginTop: 4,
  },
  contextPanel: {
    padding: token.paddingSM,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadius,
    background: token.colorBgLayout,
  },
  contextPending: {
    borderColor: token.colorWarningBorder,
    background: token.colorWarningBg,
  },
  contextPublished: {
    borderColor: token.colorSuccessBorder,
    background: token.colorSuccessBg,
  },
  contextRejected: {
    borderColor: token.colorErrorBorder,
    background: token.colorErrorBg,
  },
  currentValue: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  mediaItemMeta: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  mediaPreview: {
    width: "100%",
    maxHeight: 520,
    objectFit: "contain",
    borderRadius: token.borderRadius,
    background: token.colorBgLayout,
  },
  mediaItemLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(240px, 1fr) minmax(0, 1.5fr)",
    gap: token.margin,
    "@media (max-width: 760px)": {
      gridTemplateColumns: "1fr",
    },
  },
}));
