import { createStyles } from "antd-style";
import {
  GOOGLE_TITLE_COLOR,
  GOOGLE_URL_COLOR,
  GOOGLE_DESCRIPTION_COLOR,
} from "./EditSeoModal.constants";

export const useStyles = createStyles(({ token }) => ({
  formItem: {
    marginBottom: 16,
  },
  formItemLast: {
    marginBottom: 0,
  },
  label: {
    display: "block",
    marginBottom: 4,
    fontSize: token.fontSize,
  },
  previewTabs: {
    "& .ant-tabs-nav": {
      marginBottom: 12,
    },
  },
  // Google preview
  googlePreview: {
    background: token.colorBgLayout,
    borderRadius: 8,
    padding: 16,
  },
  googleTitle: {
    fontSize: 18,
    color: GOOGLE_TITLE_COLOR,
    display: "block",
    lineHeight: 1.3,
    marginBottom: 4,
    "&:hover": {
      textDecoration: "underline",
      cursor: "pointer",
    },
  },
  googleUrl: {
    fontSize: 13,
    color: GOOGLE_URL_COLOR,
    display: "block",
    marginBottom: 4,
  },
  googleDescription: {
    fontSize: 13,
    color: GOOGLE_DESCRIPTION_COLOR,
    lineHeight: 1.5,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  // Social preview (Facebook)
  socialPreview: {
    background: token.colorBgLayout,
    borderRadius: 8,
    overflow: "hidden",
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  socialImageWrapper: {
    width: "100%",
    height: 200,
    background: token.colorBgContainerDisabled,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: token.colorTextSecondary,
    overflow: "hidden",
    "& img": {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
  },
  socialImagePlaceholder: {
    width: "100%",
    height: 200,
    background: token.colorBgContainerDisabled,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: token.colorTextSecondary,
  },
  socialImageIcon: {
    fontSize: 48,
  },
  socialContent: {
    padding: 12,
  },
  socialDomain: {
    fontSize: 11,
    color: token.colorTextSecondary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  socialTitle: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.3,
    marginBottom: 4,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  socialDescription: {
    fontSize: 13,
    color: token.colorTextSecondary,
    lineHeight: 1.4,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  // Image upload
  draggerIcon: {
    fontSize: 32,
    color: token.colorTextSecondary,
    marginBottom: 8,
  },
  imagePreviewContainer: {
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 120,
    objectFit: "cover",
  },
  imageRemoveButton: {
    position: "absolute",
    top: 8,
    right: 8,
  },
}));
