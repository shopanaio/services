"use client";

import { useState } from "react";
import { Typography, Button, Tabs, Empty, Skeleton } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useStyles } from "../../organizations-page.styles";
import type { OrganizationsSectionProps } from "../../types";
import type { ApiOrganization } from "@/graphql/types";
import { OrganizationItem } from "../organization-item";

export function OrganizationsSection({
  organizations,
  loading = false,
  onOrganizationClick,
  onCreateOrganization,
}: OrganizationsSectionProps) {
  const { styles } = useStyles();
  const [activeTab, setActiveTab] = useState("all");

  const renderOrganizationList = (orgList: ApiOrganization[]) => {
    if (loading) {
      return (
        <div className={styles.organizationList}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} active paragraph={{ rows: 1 }} />
          ))}
        </div>
      );
    }

    if (!orgList.length) {
      return (
        <div className={styles.emptyState}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Typography.Text type="secondary">
                No organizations found
              </Typography.Text>
            }
          />
        </div>
      );
    }

    return (
      <div className={styles.organizationList}>
        {orgList.map((organization) => (
          <OrganizationItem
            key={organization.id}
            organization={organization}
            onClick={() => onOrganizationClick(organization)}
          />
        ))}
      </div>
    );
  };

  const tabItems = [
    {
      key: "all",
      label: `All${loading ? "" : ` (${organizations.length})`}`,
      children: renderOrganizationList(organizations),
    },
  ];

  return (
    <Paper>
      <PaperHeader
        title="Organizations"
        actions={
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={onCreateOrganization}
            loading={loading}
          >
            Create
          </Button>
        }
      />
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </Paper>
  );
}
