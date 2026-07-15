"use client";

import { Badge, Button, Flex, Progress, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import { useFulfillmentLayoutStyles } from "./fulfillment-layout.styles";

export function FulfillmentLayout({ title, count, onCreate, navigation, loading, children }: { title: string; count: number; onCreate: () => void; navigation: ReactNode; loading?: boolean; children: ReactNode }) {
  const { styles } = useFulfillmentLayoutStyles();
  return (
    <main className={styles.root} data-testid="fulfillment-layout">
      {loading ? <Progress className={styles.progress} percent={65} showInfo={false} size="small" status="active" /> : null}
      <header className={styles.header}>
        <Flex align="center" gap="small">
          <Typography.Title level={3} className={styles.title}>{title}</Typography.Title>
          <Badge count={count} overflowCount={9999} color="blue" showZero />
        </Flex>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>Create order</Button>
      </header>
      <div className={styles.filters}>{navigation}</div>
      <div className={styles.viewport}>{children}</div>
    </main>
  );
}
