"use client";

import { Typography, Card, Row, Col, Statistic } from "antd";
import {
  ShoppingOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { PageLayout } from "@/layouts/page/components/PageLayout";
import { PageHeader } from "@/layouts/page/components/PageHeader";

export default function DashboardPage() {
  return (
    <PageLayout>
      <PageHeader title="Dashboard" />
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Products"
              value={128}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Orders"
              value={45}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Revenue"
              value={12500}
              precision={2}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Customers"
              value={89}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </PageLayout>
  );
}
