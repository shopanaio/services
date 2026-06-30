import { createStyles } from "antd-style";

const GOOGLE_TITLE_COLOR = "#1a0dab";
const GOOGLE_URL_COLOR = "#006621";
const GOOGLE_DESCRIPTION_COLOR = "#545454";

export const useSeoPreviewStyles = createStyles(({ token }) => ({
  previewTabs: {
    "& .ant-tabs-nav": {
      marginBottom: 12,
    },
  },
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
}));
