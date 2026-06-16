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
}));
