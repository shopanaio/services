import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  rules: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  ruleCard: {
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    padding: "8px 12px",
    cursor: "pointer",
    transition: "border-color 0.2s",
    "&:hover": {
      borderColor: token.colorBorder,
    },
  },
  ruleHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "4px 0 4px 0",
  },
  ruleName: {
    fontSize: token.fontSize,
    fontWeight: 600,
  },
  rulePriority: {
    fontSize: token.fontSizeSM,
    color: token.colorTextTertiary,
    fontFamily: "monospace",
  },
  ruleBody: {
    display: "flex",
    alignItems: "stretch",
    gap: 0,
    paddingBottom: 4,
  },
  flowBlock: {
    flex: 1,
    padding: "8px 10px",
    borderRadius: 6,
    background: token.colorFillQuaternary,
  },
  flowLabel: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: token.colorTextTertiary,
    marginBottom: 6,
  },
  flowArrow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 8px",
    color: token.colorTextQuaternary,
    fontSize: 16,
    userSelect: "none" as const,
    pointerEvents: "none",
  },
  flowRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 4,
    padding: "2px 0",
    fontSize: 12,
  },
  targetTag: {
    "&&": {
      fontSize: 10,
      lineHeight: "16px",
      padding: "0 4px",
    },
  },
  targetName: {
    fontSize: 12,
    fontWeight: 500,
  },
  disabledBadge: {
    "&&": {
      fontSize: 10,
    },
  },
  compactBody: {
    paddingBottom: 4,
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  subtitle: {
    fontSize: 12,
    color: token.colorTextTertiary,
    marginBottom: 8,
  },
}));
