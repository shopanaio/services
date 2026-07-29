import { createStyles } from "antd-style";

export const useDiscountModalStyles = createStyles(({ token }) => ({
  body: {
    background: token.colorFillQuaternary,
  },
  state: {
    width: "100%",
    marginInline: "auto",
    padding: token.padding,
  },
}));
