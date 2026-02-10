import { createStyles } from 'antd-style';
import { Flex, Skeleton } from 'antd';
import SkeletonButton from 'antd/es/skeleton/Button';

const useStyles = createStyles(({ token }) => ({
  filters: {
    marginTop: token.padding,
    marginBottom: token.paddingXS,
    padding: token.paddingXXS,
    width: '100%',
    boxSizing: 'border-box',
    background: token.colorBgContainer,
  },
  filtersInner: {
    maxWidth: 90,
  },
  paper: {
    marginTop: token.paddingSM,
    background: token.colorBgContainer,
    borderRadius: token.borderRadius,
  },
  wrapper: {
    padding: `${token.padding}px ${token.paddingLG}px`,
  },
}));

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
        <Flex gap="large" vertical style={{ padding: '24px 40px' }}>
          <Skeleton active paragraph={{ rows: 5 }} />
        </Flex>
      </div>
    </div>
  );
};

export const DrawerSkeleton = () => {
  return <LayoutSkeleton filters={false} />;
};
