import { createStyles } from "antd-style";

export const useEditEligibilityChannelsModalStyles = createStyles(({ token }) => ({
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
  contextDescription: {
    padding: `${token.paddingSM}px ${token.padding}px`,
    borderRadius: token.borderRadiusLG,
    background: token.colorFillQuaternary,
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
  pickerRow: {
    width: "100%",
  },
  pickerSummary: {
    flex: 1,
  },
  selectedPaper: {
    padding: 0,
    overflow: "hidden",
  },
  selectedHeader: {
    minHeight: 52,
    marginBottom: 0,
    paddingInline: token.padding,
    paddingBlock: token.paddingSM,
  },
  selectedFields: {
    padding: `${token.paddingSM}px ${token.padding}px 0`,
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
      paddingInline: token.paddingSM,
    },
  },
  entityCell: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: token.marginSM,
  },
  entityTitle: {
    minWidth: 0,
  },
  actionCell: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
  },
  selectedFooter: {
    padding: `${token.paddingSM}px ${token.padding}px ${token.padding}px`,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  channelRow: {
    minHeight: 54,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 140px",
    alignItems: "center",
    gap: token.margin,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    "&:last-child": {
      borderBottom: 0,
    },
  },
  channelCopy: {
    minWidth: 0,
  },
  channelCode: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  info: {
    padding: token.padding,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
    color: token.colorTextSecondary,
  },
}));
