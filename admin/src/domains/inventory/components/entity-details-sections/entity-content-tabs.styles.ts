import { createStyles } from "antd-style";

export const useEntityContentTabsStyles = createStyles(({ token }) => ({
  tabsSection: {
    minHeight: 120,
  },
  renderedContent: {
    fontSize: 13,
    color: token.colorText,
    lineHeight: 1.6,
    minHeight: 80,
    maxHeight: 120,
    overflow: "hidden",
    position: "relative" as const,
    "& p": {
      margin: "0 0 8px 0",
      "&:last-child": {
        marginBottom: 0,
      },
    },
    "& h1, & h2, & h3, & h4, & h5, & h6": {
      margin: "12px 0 8px 0",
      fontWeight: 600,
      "&:first-child": {
        marginTop: 0,
      },
    },
    "& h3": {
      fontSize: 14,
    },
    "& ul, & ol": {
      margin: "8px 0",
      paddingLeft: 20,
    },
    "& li": {
      marginBottom: 4,
    },
    "&::after": {
      content: '""',
      position: "absolute" as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: 40,
      background: `linear-gradient(transparent, ${token.colorBgContainer})`,
      pointerEvents: "none" as const,
    },
  },
  richEmptyState: {
    minHeight: 204,
    padding: "28px 20px",
    borderRadius: 8,
    border: `1px dashed ${token.colorBorder}`,
    background: token.colorFillAlter,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    textAlign: "center",
  },
  richEmptyIcon: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: token.colorPrimaryBg,
    color: token.colorPrimary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: token.fontSizeXL,
  },
  richEmptyContent: {
    maxWidth: 360,
  },
  richEmptyTitle: {
    "&&": {
      margin: 0,
      marginBottom: 4,
      fontSize: token.fontSizeLG,
    },
  },
  richEmptyText: {
    "&&": {
      display: "block",
      fontSize: token.fontSize,
    },
  },
  richEmptyAction: {
    flexShrink: 0,
  },
}));
