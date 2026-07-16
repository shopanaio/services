"use client";

import { Alert, Button, Flex, Table, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { DataLayout } from "@/layouts/data";
import { useRatingCriteria } from "../hooks";
import { useRatingCriterionModal } from "../modals";
import type { RatingCriterion } from "../types";

export default function RatingCriteriaPage() {
  const query = useRatingCriteria(); const connection = query.data?.reviewsQuery.ratingCriteria; const { push } = useRatingCriterionModal();
  const columns: ColumnsType<RatingCriterion> = [
    { title: "Criterion", key: "title", render: (_, item) => <Flex vertical><Typography.Text strong>{item.defaultTitle}</Typography.Text><Typography.Text type="secondary">{item.code}</Typography.Text></Flex> },
    { title: "Weight", dataIndex: "weight", width: 100 }, { title: "Scope", key: "scope", render: (_, item) => item.appliesToAllProducts ? "All products" : `${item.assignments.length} assignments` },
    { title: "Required", dataIndex: "isRequired", width: 110, render: (value) => value ? <Tag color="blue">Required</Tag> : "Optional" },
    { title: "Status", dataIndex: "isActive", width: 100, render: (value) => <Tag color={value ? "green" : undefined}>{value ? "Active" : "Inactive"}</Tag> },
    { title: "Updated", dataIndex: "updatedAt", width: 190, render: (value) => new Date(value).toLocaleString() },
  ];
  return <DataLayout fullWidth name="rating-criteria" title="Rating criteria" count={connection?.totalCount ?? 0} actions={<Button icon={<PlusOutlined />} onClick={() => push({ onSaved: query.refetch })}>Create criterion</Button>}>
    {query.error ? <Alert type="error" showIcon message={query.error.message} /> : null}<Table rowKey="id" loading={query.loading} dataSource={connection?.edges.map((edge) => edge.node) ?? []} columns={columns} pagination={false} onRow={(criterion) => ({ onClick: () => push({ criterion, onSaved: query.refetch }), style: { cursor: "pointer" } })} />
  </DataLayout>;
}
