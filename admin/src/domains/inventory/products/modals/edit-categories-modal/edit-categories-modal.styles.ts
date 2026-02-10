import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 16,
  },
  searchWrapper: {
    marginBottom: 8,
  },
  treeWrapper: {
    maxHeight: 400,
    overflowY: "auto",
    "& .ant-tree-checkbox": {
      marginInlineEnd: 4,
    },
    "& .ant-tree-node-content-wrapper": {
      display: "flex",
      alignItems: "center",
      flex: 1,
    },
    "& .ant-tree-title": {
      flex: 1,
    },
  },
  nodeTitle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
  },
  nodeInfo: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  nodeIcon: {
    color: token.colorPrimary,
    fontSize: 14,
    flexShrink: 0,
  },
  nodeText: {
    display: "flex",
    alignItems: "baseline",
    gap: 4,
    minWidth: 0,
  },
  nodeLabel: {
    fontSize: 13,
  },
  nodeSlug: {
    fontSize: 11,
    color: token.colorTextSecondary,
  },
  nodeActions: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  primaryTag: {
    margin: 0,
    fontSize: 11,
  },
  primaryRadio: {
    marginRight: 0,
  },
  selectionSummary: {
    padding: 12,
    background: token.colorBgLayout,
    borderRadius: 8,
  },
  summaryLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: token.colorTextSecondary,
    marginBottom: 4,
    display: "block",
  },
  selectedList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  emptyState: {
    padding: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 500,
    marginBottom: 8,
    display: "block",
  },
  sectionHint: {
    fontSize: 11,
    color: token.colorTextSecondary,
    marginBottom: 12,
    display: "block",
  },
}));
