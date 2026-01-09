import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  contextCard: {
    padding: 16,
    background: token.colorFillQuaternary,
    borderRadius: 8,
    marginBottom: 20,
  },
  contextHeader: {
    fontSize: 11,
    color: token.colorTextSecondary,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 12,
    fontWeight: 600,
  },
  contextRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
    "&:last-child": {
      marginBottom: 0,
    },
  },
  contextIcon: {
    color: token.colorTextSecondary,
    marginTop: 2,
  },
  contextLabel: {
    fontSize: 12,
    color: token.colorTextSecondary,
    minWidth: 70,
  },
  contextValue: {
    fontSize: 13,
    color: token.colorText,
    flex: 1,
  },
  formSection: {
    padding: 20,
  },
  formLabel: {
    display: "block",
    marginBottom: 8,
    fontWeight: 500,
  },
  formRow: {
    marginBottom: 20,
  },
  generateButton: {
    height: 44,
    fontSize: 15,
    fontWeight: 500,
    background:
      "linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #e879f9 100%)",
    border: "none",
    "&:hover": {
      background:
        "linear-gradient(135deg, #7c3aed 0%, #c026d3 50%, #d946ef 100%)",
    },
  },
  resultSection: {
    marginTop: 20,
    padding: 16,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: 8,
    background: token.colorBgContainer,
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: token.colorText,
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 64,
    gap: 20,
  },
  loadingText: {
    fontSize: 14,
    color: token.colorTextSecondary,
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  headerIcon: {
    color: "#a855f7",
    fontSize: 18,
  },
  selectRow: {
    display: "flex",
    gap: 16,
  },
  selectItem: {
    flex: 1,
  },
}));
