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
  tagsList: {
    maxHeight: 320,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  tagRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    borderRadius: 6,
    cursor: "pointer",
    transition: "background 0.2s",
    "&:hover": {
      background: token.colorBgLayout,
    },
  },
  tagRowSelected: {
    background: token.colorPrimaryBg,
    "&:hover": {
      background: token.colorPrimaryBgHover,
    },
  },
  tagInfo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  tagIcon: {
    color: token.colorTextSecondary,
    fontSize: 14,
    flexShrink: 0,
  },
  tagLabel: {
    fontSize: 13,
  },
  tagSlug: {
    fontSize: 11,
    color: token.colorTextSecondary,
    marginLeft: 4,
  },
  tagCheckbox: {
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
    marginBottom: 8,
    display: "block",
  },
  selectedList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
  },
  selectedTag: {
    margin: 0,
    cursor: "pointer",
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
  createTagWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 6,
    background: token.colorBgLayout,
    cursor: "pointer",
    transition: "background 0.2s",
    "&:hover": {
      background: token.colorBgTextHover,
    },
  },
  createTagIcon: {
    color: token.colorPrimary,
    fontSize: 14,
  },
  createTagText: {
    fontSize: 13,
    color: token.colorPrimary,
  },
  tagColorDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
}));
