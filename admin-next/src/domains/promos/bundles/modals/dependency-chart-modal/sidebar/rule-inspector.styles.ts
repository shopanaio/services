import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  container: {
    width: 400,
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
    borderLeft: `2px solid ${token.colorPrimary}`,
    paddingLeft: 8,
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
    borderLeft: `2px solid ${token.colorPrimary}`,
    paddingLeft: 8,
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
      flex: 1,
      minWidth: 0,
      paddingLeft: 8,
    },
  },
  chipSubject: {
    color: token.colorTextSecondary,
    flexShrink: 0,
  },
  chipOperator: {
    "&&": {
      width: 24,
      height: 24,
      fontSize: 14,
      lineHeight: "24px",
      padding: 0,
      margin: 0,
      marginLeft: -4,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
  },
  chipValue: {
    fontSize: 12,
    fontWeight: 500,
    color: token.colorText,
    fontFamily: "monospace",
  },
}));
