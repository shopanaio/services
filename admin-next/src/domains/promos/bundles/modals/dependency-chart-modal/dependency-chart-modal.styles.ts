import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token, isDarkMode }) => ({
  container: {
    width: "100%",
    display: "flex",
    height: "calc(100vh - 120px)",
    padding: token.padding,
    boxSizing: "border-box",
  },
  chartArea: {
    flex: 1,
    position: "relative",
  },
  reactFlow: {
    background: token.colorBgLayout,
    "& .react-flow__node.selected": {
      outline: "none",
      boxShadow: "none",
    },
    "& .react-flow__node:focus": {
      outline: "none",
    },
    "& .react-flow__controls": {
      background: token.colorBgContainer,
      borderColor: token.colorBorder,
      boxShadow: token.boxShadowSecondary,
    },
    "& .react-flow__controls-button": {
      background: token.colorBgContainer,
      borderColor: token.colorBorder,
      fill: token.colorText,
      "&:hover": {
        background: token.colorBgTextHover,
      },
    },
    "& .react-flow__edgelabel-renderer": {
      "& .ant-tag": {
        background: isDarkMode ? token.colorBgElevated : undefined,
      },
    },
  },
  controls: {
    position: "absolute",
    top: 10,
    left: 10,
    display: "flex",
    gap: 8,
  },
}));
