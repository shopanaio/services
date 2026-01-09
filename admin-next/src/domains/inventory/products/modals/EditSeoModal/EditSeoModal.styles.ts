import { createStyles } from "antd-style";

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
  ogExtra: {
    fontSize: 12,
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
