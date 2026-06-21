"use client";

import { Descriptions } from "antd";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { ApiWarehouse } from "@/graphql/types";

interface ActivitySectionProps {
  warehouse: ApiWarehouse;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ActivitySection({ warehouse }: ActivitySectionProps) {
  return (
    <Paper>
      <PaperHeader title="Activity" />
      <Descriptions size="small" column={1}>
        <Descriptions.Item label="Created at">
          {formatDateTime(warehouse.createdAt)}
        </Descriptions.Item>
        <Descriptions.Item label="Last updated">
          {formatDateTime(warehouse.updatedAt)}
        </Descriptions.Item>
      </Descriptions>
    </Paper>
  );
}
