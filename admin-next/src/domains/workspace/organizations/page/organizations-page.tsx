"use client";

import { useRouter } from "next/navigation";
import { Typography, message } from "antd";
import { SettingsLayout } from "../../layout";
import { OrganizationsSection } from "./components";
import { mockOrganizations } from "./constants";
import type { IOrganization } from "./types";
import { useStyles } from "./organizations-page.styles";

export default function OrganizationsPage() {
  const router = useRouter();
  const { styles } = useStyles();

  const handleOrganizationClick = (organization: IOrganization) => {
    router.push(`/workspace/${organization.name}`);
  };

  const handleCreateOrganization = () => {
    message.info("Create organization modal would open");
  };

  return (
    <SettingsLayout name="organizations">
      <div className={styles.pageHeader}>
        <Typography.Title level={2} className={styles.pageTitle}>
          Organizations
        </Typography.Title>
        <Typography.Text className={styles.pageDescription}>
          Manage your organizations and access their settings
        </Typography.Text>
      </div>

      <OrganizationsSection
        organizations={mockOrganizations}
        onOrganizationClick={handleOrganizationClick}
        onCreateOrganization={handleCreateOrganization}
      />
    </SettingsLayout>
  );
}
