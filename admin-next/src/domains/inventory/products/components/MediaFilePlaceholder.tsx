import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token }) => ({
  placeholder: {
    opacity: 0.5,
    cursor: 'default',
    aspectRatio: '1/1',
    width: '100%',
    borderRadius: token.borderRadiusLG,
    border: `1px dashed ${token.colorPrimary}`,
    backgroundColor: token.colorPrimaryBg,
    transition: 'all 0.2s ease-in-out',
  },
}));

export const MediaFilePlaceholder = () => {
  const { styles } = useStyles();

  return <div className={styles.placeholder} />;
};
