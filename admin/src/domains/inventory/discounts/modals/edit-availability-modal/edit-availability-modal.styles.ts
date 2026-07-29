import { createStyles } from "antd-style";

export const useEditAvailabilityModalStyles = createStyles(({ token }) => ({
  body: {
    background: token.colorFillQuaternary,
  },
  container: {
    width: "100%",
    maxWidth: 1050,
    marginInline: "auto",
    display: "flex",
    flexDirection: "column",
    gap: token.margin,
    padding: token.padding,
    boxSizing: "border-box",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: token.marginSM,
  },
  optionList: {
    display: "flex",
    flexDirection: "column",
    gap: token.marginSM,
  },
  option: {
    display: "flex",
    alignItems: "flex-start",
  },
  optionCopy: {
    display: "flex",
    flexDirection: "column",
  },
  optionHelp: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  field: {
    minWidth: 0,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: token.margin,
    "@media (max-width: 720px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  fieldLabel: {
    display: "block",
    marginBottom: token.marginXXS,
  },
  fieldHelp: {
    display: "block",
    marginTop: token.marginXXS,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  info: {
    padding: `${token.paddingSM}px ${token.padding}px`,
    borderRadius: token.borderRadiusLG,
    background: token.colorFillQuaternary,
    color: token.colorTextSecondary,
  },
}));
