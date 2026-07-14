"use client";

import { Empty, Typography } from "antd";
import { DataLayout } from "@/layouts/data";

interface EmptySectionPageProps {
  name: string;
  title: string;
}

export const EmptySectionPage = ({ name, title }: EmptySectionPageProps) => (
  <DataLayout fullWidth name={name} title={title}>
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Typography.Text type="secondary">
            {title} is coming soon
          </Typography.Text>
        }
      />
    </div>
  </DataLayout>
);
