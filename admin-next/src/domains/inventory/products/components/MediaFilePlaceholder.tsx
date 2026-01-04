import { createStyles } from "antd-style";

const useStyles = createStyles(({ token }) => ({
  placeholder: {
    // opacity: 0.5,
    cursor: "default",
    aspectRatio: "1/1",
    width: "100%",
    borderRadius: token.borderRadius,
    border: `1px dashed ${token.colorBorder}`,
    backgroundColor: token.colorBgLayout,
    transition: "all 0.2s ease-in-out",
    boxSizing: "border-box",
  },
}));

export const MediaFilePlaceholder = () => {
  const { styles } = useStyles();

  return <div className={styles.placeholder} />;
};
