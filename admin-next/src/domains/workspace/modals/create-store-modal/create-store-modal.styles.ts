import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    padding: token.paddingLG,
    background: token.colorBgLayout,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
  },
  stepsContainer: {
    padding: `${token.paddingMD}px ${token.paddingLG}px`,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: token.paddingLG,
    overflowY: "auto",
  },
  formContainer: {
    width: "100%",
    maxWidth: 480,
  },
  title: {
    textAlign: "center",
    marginBottom: `${token.marginXL}px !important`,
    marginTop: `-${token.marginXL}px !important`,
  },
  formItem: {
    marginBottom: token.marginLG,
  },
  label: {
    display: "block",
    marginBottom: token.marginXS,
    fontWeight: 500,
    fontSize: token.fontSizeSM,
  },
  required: {
    color: token.colorError,
    marginLeft: 2,
  },
  helper: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    marginTop: token.marginXXS,
  },
  error: {
    color: token.colorError,
    fontSize: token.fontSizeSM,
    marginTop: token.marginXXS,
  },
  navigation: {
    flexShrink: 0,
    display: "flex",
    justifyContent: "space-between",
    padding: token.paddingMD,
    borderTop: `1px solid ${token.colorBorderSecondary}`,
  },
  finishContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: token.paddingXL,
  },
  finishTitle: {
    marginBottom: token.marginSM,
  },
  finishSubtitle: {
    color: token.colorTextSecondary,
    marginBottom: token.marginXL,
  },
  progressContainer: {
    marginTop: token.marginLG,
  },
  localeTag: {
    height: 32,
    marginRight: 3,
    display: "flex",
    alignItems: "center",
  },
  progressImageContainer: {
    marginLeft: 21,
    marginTop: 5,
    borderRadius: "100%",
    overflow: "hidden",
    width: 160,
  },
  progressImage: {
    width: "100%",
    height: "100%",
  },
}));
