import { createStyles } from "antd-style";

export const useMediaPickerStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    minHeight: 0,
    flex: 1,
  },
  toolbar: {
    paddingTop: token.paddingSM,
    flexShrink: 0,
    marginBottom: token.marginSM,
  },
  draggerSection: {
    marginBottom: token.marginSM,
  },
  dragger: {
    borderRadius: 8,
    border: `2px dashed ${token.colorBorder}`,
    background: token.colorBgContainer,
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: token.colorPrimary,
      background: token.colorPrimaryBg,
    },
    "& .ant-upload": {
      padding: 0,
    },
    "& .ant-upload-btn": {
      padding: "16px 24px !important",
    },
    "& .ant-upload-drag-container": {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    },
  },
  draggerIcon: {
    fontSize: 24,
    color: token.colorPrimary,
    marginBottom: token.marginXS,
  },
  draggerTitle: {
    fontSize: token.fontSizeLG,
    fontWeight: 600,
    color: token.colorText,
    marginBottom: 4,
  },
  draggerHint: {
    fontSize: 13,
    color: token.colorTextSecondary,
  },
  browseLink: {
    color: token.colorPrimary,
    cursor: "pointer",
    fontWeight: 500,
  },
  gridContainer: {
    flex: 1,
    minHeight: 400,
    width: "100%",
  },
  pagination: {
    flexShrink: 0,
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(255, 255, 255, 0.8)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    borderRadius: 8,
  },
}));
