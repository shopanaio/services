import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  container: {
    width: 320,
    height: "100%",
  },
  containerCollapsed: {
    width: 56,
  },
  collapsedContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 12,
  },
  verticalText: {
    writingMode: "vertical-rl",
    textOrientation: "mixed",
    transform: "rotate(180deg)",
    fontSize: 12,
    fontWeight: 600,
    color: token.colorTextSecondary,
    letterSpacing: "1px",
  },
  content: {
    flex: 1,
    overflowY: "auto",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: token.colorTextSecondary,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    color: token.colorTextSecondary,
    marginBottom: 4,
    display: "block",
  },
  conditionItem: {
    padding: 8,
    background: token.colorBgLayout,
    borderRadius: token.borderRadius,
    marginBottom: 8,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  conditionRow: {
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  actionItem: {
    padding: 8,
    background: token.colorBgLayout,
    borderRadius: token.borderRadius,
    marginBottom: 8,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  deleteButton: {
    flexShrink: 0,
  },
  emptyConditions: {
    padding: "16px 0",
    textAlign: "center",
  },
  operatorChip: {
    "&&": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: 6,
      fontSize: 12,
      flex: 1,
      minWidth: 0,
    },
  },
  chipSubject: {
    color: token.colorTextSecondary,
    fontSize: 11,
    flexShrink: 0,
  },
  chipOperator: {
    "&&": {
      fontSize: 11,
      lineHeight: "18px",
      padding: "0 5px",
      borderRadius: 3,
      margin: 0,
      marginLeft: -8,
    },
  },
  chipValue: {
    fontSize: 12,
    fontWeight: 500,
    color: token.colorText,
    fontFamily: "monospace",
  },
}));
