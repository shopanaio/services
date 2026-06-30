import { createStyles } from "antd-style";

export const useEntityEditFormStyles = createStyles(({ token }) => ({
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
  error: {
    color: token.colorError,
    fontSize: token.fontSizeSM,
    marginTop: 4,
  },
  extra: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    marginTop: 4,
  },
  ogExtra: {
    fontSize: 12,
  },
  draggerIcon: {
    fontSize: 32,
    color: token.colorTextSecondary,
    marginBottom: 8,
  },
  uploadArea: {
    padding: "24px 16px",
    border: `2px dashed ${token.colorBorder}`,
    borderRadius: token.borderRadius,
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: token.colorPrimary,
      background: token.colorPrimaryBg,
    },
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
