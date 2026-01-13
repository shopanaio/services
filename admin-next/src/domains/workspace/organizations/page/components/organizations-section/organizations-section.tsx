"use client";

import { useState } from "react";
import { Typography, Button, Tabs, Empty } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useStyles } from "../../organizations-page.styles";
import type { IOrganizationsSectionProps, IOrganization } from "../../types";
import { OrganizationItem } from "../organization-item";

export function OrganizationsSection({
  organizations,
  onOrganizationClick,
  onCreateOrganization,
}: IOrganizationsSectionProps) {
  const { styles } = useStyles();
  const [activeTab, setActiveTab] = useState("all");

  const activeOrganizations = organizations.filter((o) => o.status === "active");
  const inactiveOrganizations = organizations.filter((o) => o.status === "inactive");

  const renderOrganizationList = (orgList: IOrganization[]) => {
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
      label: `All (${organizations.length})`,
      children: renderOrganizationList(organizations),
    },
    {
      key: "active",
      label: `Active (${activeOrganizations.length})`,
      children: renderOrganizationList(activeOrganizations),
    },
    {
      key: "inactive",
      label: `Inactive (${inactiveOrganizations.length})`,
      children: renderOrganizationList(inactiveOrganizations),
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
          >
            Create Organization
          </Button>
        }
      />
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />
    </Paper>
  );
}
