import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  container: {
    width: 400,
    height: "100%",
    display: "flex",
    flexDirection: "column",
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
    padding: token.padding,
  },
  // Header section
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    flexShrink: 0,
    borderRadius: token.borderRadiusLG,
  },
  avatarGroup: {
    flexShrink: 0,
    borderRadius: token.borderRadiusLG,
    backgroundColor: token.colorPrimary,
  },
  avatarBundle: {
    flexShrink: 0,
    borderRadius: token.borderRadiusLG,
    backgroundColor: token.colorSuccess,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
  },
  groupLabel: {
    fontSize: 11,
    lineHeight: 1.2,
  },
  title: {
    fontSize: 16,
    lineHeight: 1.3,
    wordBreak: "break-word",
  },
  variantTag: {
    marginTop: 4,
    width: "fit-content",
  },
  // Status row
  statusRow: {
    flexWrap: "wrap",
  },
  // Divider
  divider: {
    margin: "12px 0",
  },
  // ID section
  idSection: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  idLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  idValue: {
    fontSize: 11,
  },
  // Items list (for group)
  itemsList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  itemsLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  itemsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  itemChip: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    background: token.colorBgContainerDisabled,
    borderRadius: token.borderRadiusSM,
  },
  itemChipText: {
    fontSize: 12,
    flex: 1,
    minWidth: 0,
  },
  // Description
  description: {
    fontSize: 12,
    marginBottom: 0,
  },
  // Stats grid (for item)
  statsGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  statItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  statIcon: {
    fontSize: 18,
    color: token.colorTextTertiary,
    width: 24,
    textAlign: "center",
  },
  statContent: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  statLabel: {
    fontSize: 11,
    lineHeight: 1.2,
  },
}));
