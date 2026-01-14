import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  // Stores styles
  storeItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: token.padding,
    backgroundColor: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    "&:hover": {
      backgroundColor: token.colorBgTextHover,
      borderColor: token.colorBorder,
    },
  },
  storeItemDisabled: {
    cursor: "not-allowed",
    opacity: 0.6,
    "&:hover": {
      backgroundColor: token.colorBgContainer,
      borderColor: token.colorBorder,
    },
  },
  storeInfo: {
    marginLeft: token.marginMD,
  },
  storeName: {
    fontWeight: 500,
    marginBottom: 0,
  },
  storeSlug: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  storeList: {
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
  // Members styles
  searchRow: {
    marginBottom: token.marginMD,
  },
  memberCell: {
    display: "flex",
    alignItems: "center",
    gap: token.marginSM,
  },
  memberInfo: {
    display: "flex",
    flexDirection: "column",
  },
  memberName: {
    fontWeight: 500,
  },
  memberEmail: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  invitationItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: token.padding,
    backgroundColor: token.colorBgLayout,
    borderRadius: token.borderRadius,
    marginBottom: token.marginSM,
  },
  invitationInfo: {
    display: "flex",
    alignItems: "center",
    gap: token.marginSM,
  },
  invitationIcon: {
    fontSize: 20,
    color: token.colorTextSecondary,
  },
  invitationDetails: {
    display: "flex",
    flexDirection: "column",
  },
  invitationEmail: {
    fontWeight: 500,
  },
  invitationMeta: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  invitationActions: {
    display: "flex",
    gap: token.marginXS,
  },
  footer: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    marginTop: token.marginSM,
  },
  // Roles styles
  roleCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: token.padding,
    backgroundColor: token.colorBgContainer,
    borderRadius: token.borderRadius,
    marginBottom: token.marginXS,
    border: `1px solid ${token.colorBorderSecondary}`,
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    "&:hover": {
      backgroundColor: token.colorBgTextHover,
      borderColor: token.colorBorder,
    },
  },
  roleInfo: {
    display: "flex",
    alignItems: "flex-start",
    gap: token.marginSM,
  },
  roleIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  roleDetails: {
    display: "flex",
    flexDirection: "column",
  },
  roleName: {
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: token.marginXS,
  },
  roleDescription: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    marginTop: 2,
  },
  roleActions: {
    display: "flex",
    gap: token.marginXS,
  },
}));
