"use client";

import { Flex, Skeleton, Spin } from "antd";
import { createStyles } from "antd-style";
import { Paper } from "@/ui-kit/paper";

const useStyles = createStyles(({ token }) => ({
  loading: {
    flex: 1,
    minHeight: 360,
    position: "relative",
  },
  skeletons: {
    display: "flex",
    flexDirection: "column",
    gap: token.padding,
  },
  indicator: {
    inset: 0,
    pointerEvents: "none",
    position: "absolute",
  },
}));

export function AdminAppLoadingContent() {
  const { styles } = useStyles();

  return (
    <div className={styles.loading}>
      <div aria-hidden className={styles.skeletons}>
        <Paper>
          <Skeleton active paragraph={{ rows: 2 }} />
        </Paper>
        <Paper>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Paper>
        <Paper>
          <Skeleton active paragraph={{ rows: 3 }} />
        </Paper>
      </div>
      <Flex
        align="center"
        aria-label="Loading app page"
        className={styles.indicator}
        justify="center"
        role="status"
      >
        <Spin size="small" />
      </Flex>
    </div>
  );
}
