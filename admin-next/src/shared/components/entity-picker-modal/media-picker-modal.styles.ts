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
  draggerIcon: {
    fontSize: 24,
    color: token.colorIcon,
    marginBottom: token.marginXS,
  },
  draggerTitle: {
    fontSize: token.fontSizeLG,
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
