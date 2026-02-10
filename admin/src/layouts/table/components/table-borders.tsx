import { createStyles } from 'antd-style';

const useTopBorderStyles = createStyles(({ token }) => ({
  outer: {
    position: 'sticky',
    top: 64,
    background: token.colorBgLayout,
    zIndex: 100,
    padding: 0,
    marginLeft: 0,
    width: '100%',
    marginBottom: -token.paddingXS,
    pointerEvents: 'none',
  },
  inner: {
    backgroundColor: token.colorBgContainer,
    height: token.paddingXS,
    borderTopLeftRadius: token.borderRadius,
    borderTopRightRadius: token.borderRadius,
    border: `1px solid ${token.colorBorder}`,
    borderBottom: 'none',
  },
}));

export const TableTopBorder = () => {
  const { styles } = useTopBorderStyles();

  return (
    <div className={styles.outer}>
      <div className={styles.inner} />
    </div>
  );
};

const useBottomBorderStyles = createStyles(({ css, token }, { bottom }: { bottom: number }) => ({
  outer: css`
    position: sticky;
    bottom: ${bottom}px;
    background: ${token.colorBgLayout};
    z-index: 100;
    padding: 0 0 ${token.paddingXS}px;
    margin-left: 0;
    width: 100%;
  `,
  inner: css`
    background-color: ${token.colorBgContainer};
    height: ${token.paddingXS}px;
    border-bottom-left-radius: ${token.borderRadius}px;
    border-bottom-right-radius: ${token.borderRadius}px;
    border: 1px solid ${token.colorBorder};
    border-top: none;
  `,
}));

export const TableBottomBorder = ({ bottom = 48 }: { bottom?: number }) => {
  const { styles } = useBottomBorderStyles({ bottom });

  return (
    <div className={styles.outer}>
      <div className={styles.inner} />
    </div>
  );
};
