import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  organizationItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: token.padding,
    backgroundColor: token.colorBgContainer,
    border: `1px solid ${token.colorBorder}`,
    borderRadius: token.borderRadiusLG,
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    "&:hover": {
      backgroundColor: token.colorBgTextHover,
      borderColor: token.colorPrimaryBorder,
    },
  },
  organizationItemDisabled: {
    cursor: "not-allowed",
    opacity: 0.6,
    "&:hover": {
      backgroundColor: token.colorBgContainer,
      borderColor: token.colorBorder,
    },
  },
  organizationInfo: {
    marginLeft: token.marginMD,
  },
  organizationName: {
    fontWeight: 500,
    marginBottom: 0,
  },
  organizationSlug: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  organizationMeta: {
    display: "flex",
    gap: token.marginMD,
    marginTop: 4,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  organizationList: {
    display: "flex",
    flexDirection: "column",
    gap: token.marginSM,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: `${token.paddingXL * 2}px 0`,
  },
  pageHeader: {
    marginBottom: token.marginLG,
  },
  pageTitle: {
    marginBottom: token.marginXS,
  },
  pageDescription: {
    color: token.colorTextSecondary,
  },
}));
