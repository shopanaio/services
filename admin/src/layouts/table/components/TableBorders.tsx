import { createStyles } from 'antd-style';

const useTopBorderStyles = createStyles({
  outer: {
    position: 'sticky',
    top: 64,
    background: 'var(--bg-gradient)',
    zIndex: 100,
    padding: 0,
    marginLeft: 0,
    width: '100%',
    marginBottom: 'calc(-1 * var(--x2))',
    pointerEvents: 'none',
  },
  inner: {
    backgroundColor: 'var(--color-gray-1)',
    height: 'var(--x2)',
    borderTopLeftRadius: 'var(--radius-base)',
    borderTopRightRadius: 'var(--radius-base)',
    border: '1px solid var(--color-border)',
    borderBottom: 'none',
  },
});

export const TableTopBorder = () => {
  const { styles } = useTopBorderStyles();

  return (
    <div className={styles.outer}>
      <div className={styles.inner} />
    </div>
  );
};

const useBottomBorderStyles = createStyles(({ css }, { bottom }: { bottom: number }) => ({
  outer: css`
    position: sticky;
    bottom: ${bottom}px;
    background: var(--bg-gradient);
    z-index: 100;
    padding: 0 0 var(--x2);
    margin-left: 0;
    width: 100%;
  `,
  inner: css`
    background-color: var(--color-gray-1);
    height: var(--x2);
    border-bottom-left-radius: var(--radius-base);
    border-bottom-right-radius: var(--radius-base);
    border: 1px solid var(--color-border);
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
