import { createStyles } from 'antd-style';
import { Flex, Skeleton } from 'antd';
import SkeletonButton from 'antd/es/skeleton/Button';

const useStyles = createStyles({
  filters: {
    marginTop: 'var(--x4)',
    marginBottom: 'var(--x2)',
    padding: 'var(--x1)',
    width: '100%',
    boxSizing: 'border-box',
    background: '#fff',
  },
  filtersInner: {
    maxWidth: 90,
  },
  paper: {
    marginTop: 'var(--x3)',
    background: 'var(--color-bg-container)',
    borderRadius: 'var(--radius-base)',
  },
  wrapper: {
    padding: 'var(--x4) var(--x6)',
  },
});

const FiltersSkeleton = () => {
  const { styles } = useStyles();

  return (
    <div className={styles.filters}>
      <div className={styles.filtersInner}>
        <Skeleton.Button block size="default" active shape="default" />
      </div>
    </div>
  );
};

const HeaderSkeleton = () => {
  return (
    <Flex style={{ height: 32 }} justify="space-between" align="center">
      <div style={{ width: 150 }}>
        <SkeletonButton block active shape="round" size="small" />
      </div>
      <div style={{ width: 100 }}>
        <SkeletonButton active block />
      </div>
    </Flex>
  );
};

export const LayoutSkeleton = ({ filters = true }: { filters?: boolean }) => {
  const { styles } = useStyles();

  return (
    <div className={styles.wrapper}>
      <HeaderSkeleton />
      {filters && <FiltersSkeleton />}
      <div className={styles.paper}>
        <Flex gap="large" vertical style={{ padding: 'var(--x6) var(--x10)' }}>
          <Skeleton active paragraph={{ rows: 5 }} />
        </Flex>
      </div>
    </div>
  );
};

export const DrawerSkeleton = () => {
  return <LayoutSkeleton filters={false} />;
};
