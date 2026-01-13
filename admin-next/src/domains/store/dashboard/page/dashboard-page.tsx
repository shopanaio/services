"use client";

import { Typography, Card, Row, Col, Statistic } from "antd";
import { ShopOutlined, TeamOutlined, ShoppingCartOutlined, DollarOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import type { ModulePageProps } from "@/registry";

const useStyles = createStyles(({ token }) => ({
  container: {
    padding: token.paddingLG,
    minHeight: "100vh",
    background: token.colorBgLayout,
  },
  header: {
    marginBottom: token.marginLG,
  },
  statsRow: {
    marginBottom: token.marginLG,
  },
}));

export default function StoreDashboardPage({ pathParams }: ModulePageProps) {
  const { styles } = useStyles();
  const orgName = pathParams.orgName as string;
  const storeName = pathParams.storeName as string;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Typography.Title level={2}>
          <ShopOutlined /> {storeName}
        </Typography.Title>
        <Typography.Text type="secondary">
          Organization: {orgName}
        </Typography.Text>
      </div>

      <Row gutter={16} className={styles.statsRow}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Products"
              value={128}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Orders"
              value={1024}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Customers"
              value={256}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Revenue"
              value={12580}
              prefix={<DollarOutlined />}
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Recent Activity">
        <Typography.Text type="secondary">
          Store dashboard content will be displayed here.
        </Typography.Text>
      </Card>
    </div>
  );
}
