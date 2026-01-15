import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: "16px 24px 24px",
  },

  paper: {
    padding: `${token.padding}px 0 0`,
  },

  // Tabs section
  tabsContainer: {
    marginBottom: 0,
    "& .ant-tabs-nav": {
      marginBottom: 0,
      paddingInline: 16,
    },
  },

  // Tab content area
  tabContent: {
    padding: 16,
  },

  // Upload dragger area
  draggerWrapper: {
    display: "flex",
    flexDirection: "column",
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
      padding: "32px 24px !important",
    },
    "& .ant-upload-drag-container": {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    },
  },
  uploadIcon: {
    fontSize: 48,
    color: token.colorPrimary,
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: token.colorText,
    margin: "0 0 4px 0",
    textAlign: "center" as const,
  },
  uploadHint: {
    fontSize: 13,
    color: token.colorTextSecondary,
    textAlign: "center" as const,
    margin: "0 0 2px 0",
    lineHeight: 1.5,
  },
  browseLink: {
    color: token.colorPrimary,
    cursor: "pointer",
    fontWeight: 500,
    "&:hover": {
      textDecoration: "underline",
    },
  },

  // URL input section
  urlSection: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  urlInputWrapper: {
    display: "flex",
    gap: 12,
  },
  urlInput: {
    flex: 1,
  },
  urlButton: {
    minWidth: 100,
  },

  // Preview section
  previewSection: {
    marginTop: 8,
  },
  previewTitle: {
    fontWeight: 600,
    marginBottom: 12,
    color: token.colorText,
  },
  previewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: 12,
  },
  previewItem: {
    position: "relative" as const,
    aspectRatio: "1",
    borderRadius: 8,
    overflow: "hidden",
    border: `1px solid ${token.colorBorder}`,
    background: token.colorBgContainer,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
  },
  previewVideo: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#000",
    color: "#fff",
    fontSize: 12,
    textAlign: "center" as const,
  },
  previewRemove: {
    position: "absolute" as const,
    top: 4,
    right: 4,
    background: "rgba(0, 0, 0, 0.6)",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: 24,
    height: 24,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "&:hover": {
      background: "rgba(0, 0, 0, 0.8)",
    },
  },

  // Footer info
  footerInfo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    background: token.colorBgLayout,
    borderRadius: 6,
    color: token.colorTextSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  infoIcon: {
    fontSize: 16,
    color: token.colorPrimary,
  },
}));
