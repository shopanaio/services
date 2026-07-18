import { createStyles } from "antd-style";

export const useDiscountModalStyles = createStyles(({ token }) => ({
  body: {
    minHeight: "100%",
    paddingBlock: token.paddingLG,
    paddingInline: token.padding,
    background: token.colorFillQuaternary,
  },
  content: {
    width: "100%",
    maxWidth: 800,
    marginInline: "auto",
  },
  state: {
    width: "100%",
    maxWidth: 800,
    marginInline: "auto",
    padding: token.padding,
  },
}));
