import { createStyles } from "antd-style";

export const useEditValueTargetsModalStyles = createStyles(({ token }) => ({
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
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: token.margin,
    "@media (max-width: 720px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
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
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    lineHeight: 1.35,
  },
  allocation: {
    alignItems: "flex-start",
  },
  allocationCopy: {
    display: "flex",
    flexDirection: "column",
  },
  targetGroup: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: token.marginSM,
    "@media (max-width: 720px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  targetOption: {
    display: "flex",
    width: "100%",
    minHeight: 72,
    marginInlineEnd: 0,
    padding: `${token.paddingSM}px ${token.padding}px`,
    border: `1px solid ${token.colorBorder}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
    alignItems: "center",
    boxSizing: "border-box",
    transition: `border-color ${token.motionDurationMid}, background ${token.motionDurationMid}, box-shadow ${token.motionDurationMid}`,
    "&:hover": {
      borderColor: token.colorPrimaryBorderHover,
    },
    ".ant-radio + span": {
      minWidth: 0,
      flex: 1,
      paddingInlineStart: token.paddingSM,
      paddingInlineEnd: 0,
    },
  },
  targetOptionSelected: {
    borderColor: token.colorPrimary,
    background: token.colorPrimaryBg,
    boxShadow: `inset 0 0 0 1px ${token.colorPrimary}`,
    "&:hover": {
      borderColor: token.colorPrimary,
    },
  },
  targetCopy: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  targetTitle: {
    fontWeight: token.fontWeightStrong,
  },
  targetDescription: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
  },
  pickerRow: {
    width: "100%",
  },
  pickerSummary: {
    flex: 1,
  },
  selectedTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: token.marginXS,
  },
  selectedTag: {
    margin: 0,
  },
}));
