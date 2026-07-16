"use client";

import { Alert, Button, Flex, Table, Tag, Typography } from "antd";
import { LuPlus as PlusOutlined } from "react-icons/lu";
import type { ColumnsType } from "antd/es/table";
import { DataLayout } from "@/layouts/data";
import { useReviewRequestModal } from "../modals";
import { useReviewRequests } from "../hooks";
import type { ReviewRequest } from "../types";
import { useUgcNavigation } from "@/domains/customer-content/use-ugc-navigation";

export default function ReviewRequestsPage() {
  const { backToUgc } = useUgcNavigation();
  const query = useReviewRequests(); const connection = query.data?.reviewsQuery.reviewRequests; const { push } = useReviewRequestModal();
  const columns: ColumnsType<ReviewRequest> = [
    { title: "Customer", key: "customer", render: (_, item) => <Flex vertical><Typography.Text strong>{item.customer.displayName}</Typography.Text><Typography.Text type="secondary">{item.customer.email ?? item.customer.id}</Typography.Text></Flex> },
    { title: "Product", key: "product", render: (_, item) => <Flex vertical><Typography.Text>{item.product.title}</Typography.Text><Typography.Text type="secondary">Order {item.orderId}</Typography.Text></Flex> },
    { title: "Channel", dataIndex: "channel", width: 110, render: (value) => String(value).toLowerCase().replaceAll("_", " ") },
    { title: "Status", dataIndex: "status", width: 120, render: (value) => <Tag color={value === "SUBMITTED" ? "green" : value === "FAILED" ? "red" : "blue"}>{String(value).toLowerCase()}</Tag> },
    { title: "Scheduled", dataIndex: "scheduledAt", width: 180, render: (value) => new Date(value).toLocaleString() },
    { title: "Attempts", dataIndex: "attemptCount", width: 90 },
  ];
  return <DataLayout fullWidth name="review-requests" title="Review requests" count={connection?.totalCount ?? 0} onBack={backToUgc} actions={<Button icon={<PlusOutlined />} onClick={() => push({ onSaved: query.refetch })}>Create request</Button>}>
    {query.error ? <Alert type="error" showIcon message={query.error.message} /> : null}<Table rowKey="id" loading={query.loading} dataSource={connection?.edges.map((edge) => edge.node) ?? []} columns={columns} pagination={{ pageSize: 20, showSizeChanger: true }} onRow={(reviewRequest) => ({ onClick: () => push({ reviewRequest, onSaved: query.refetch }), style: { cursor: "pointer" } })} />
  </DataLayout>;
}
