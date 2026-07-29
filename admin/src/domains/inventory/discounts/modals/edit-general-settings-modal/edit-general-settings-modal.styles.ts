import { createStyles } from "antd-style";

export const useEditGeneralSettingsModalStyles = createStyles(({ token }) => ({
  body: {
    background: token.colorFillQuaternary,
  },
  container: {
    display: "flex",
    flexDirection: "column",
    gap: token.margin,
    padding: token.padding,
  },
  definitionGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: token.margin,
    "@media (max-width: 720px)": {
      gridTemplateColumns: "1fr",
    },
  },
  field: {
    minWidth: 0,
  },
  fieldLabel: {
    display: "block",
    marginBottom: token.marginXXS,
  },
  fieldHelp: {
    display: "block",
    marginTop: token.marginXXS,
    fontSize: token.fontSizeSM,
  },
  codesPaper: {
    padding: 0,
    overflow: "hidden",
  },
  codesHeader: {
    minHeight: 52,
    marginBottom: 0,
    paddingInline: token.padding,
    paddingBlock: token.paddingSM,
  },
  gridFrame: {
    margin: `${token.marginSM}px ${token.margin}px 0`,
    overflow: "hidden",
    border: `1px solid ${token.colorBorder}`,
    borderRadius: token.borderRadiusLG,
    "& .ag-root-wrapper": {
      border: 0,
      borderRadius: 0,
    },
    "& .ag-header": {
      borderBottomColor: token.colorBorderSecondary,
    },
    "& .ag-header-cell": {
      paddingInline: token.paddingSM,
      fontSize: token.fontSizeSM,
      fontWeight: token.fontWeightStrong,
    },
    "& .ag-cell": {
      display: "flex",
      alignItems: "center",
      paddingInline: token.paddingXS,
    },
    "& .ag-cell-last-left-pinned, & .ag-cell-last-right-pinned": {
      border: 0,
    },
    "& .ag-row:last-child": {
      borderBottom: 0,
    },
    "& .ant-input, & .ant-input-number, & .ant-select-selector": {
      minHeight: 32,
    },
  },
  cellControl: {
    width: "100%",
  },
  actionCell: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
  },
  footer: {
    padding: `${token.paddingSM}px ${token.padding}px ${token.padding}px`,
  },
  footerText: {
    fontSize: token.fontSizeSM,
  },
}));
