import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  tabsSection: {
    minHeight: 120,
  },
  contentText: {
    "&&": {
      margin: 0,
      fontSize: 13,
      color: token.colorText,
      lineHeight: 1.6,
    },
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
}));
