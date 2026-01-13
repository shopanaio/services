"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Typography, message } from "antd";
import { SettingsLayout } from "../../layout";
import { OrganizationsSection } from "./components";
import { useOrganizations, useCreateOrganization } from "../../hooks";
import type { IOrganization } from "./types";
import { toDisplayOrganization } from "./types";
import { useStyles } from "./organizations-page.styles";

export default function OrganizationsPage() {
  const router = useRouter();
  const { styles } = useStyles();

  // Fetch organizations from API
  const { organizations: apiOrganizations, loading, refetch } = useOrganizations();
  const { createOrganization, loading: creating } = useCreateOrganization();

  // Transform API data to display format
  const organizations = useMemo(
    () => apiOrganizations.map(toDisplayOrganization),
    [apiOrganizations]
  );

  const handleOrganizationClick = useCallback(
    (organization: IOrganization) => {
      router.push(`/workspace/${organization.name}`);
    },
    [router]
  );

  const handleCreateOrganization = useCallback(async () => {
    // TODO: Open create organization modal
    // For now, create a test organization
    const { organization, userErrors } = await createOrganization({
      name: `org-${Date.now()}`,
      displayName: "New Organization",
    });

    if (userErrors.length > 0) {
      userErrors.forEach((err) => message.error(err.message));
      return;
    }

    if (organization) {
      message.success("Organization created successfully");
      refetch();
      router.push(`/workspace/${organization.name}`);
    }
  }, [createOrganization, refetch, router]);

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
        organizations={organizations}
        loading={loading || creating}
        onOrganizationClick={handleOrganizationClick}
        onCreateOrganization={handleCreateOrganization}
      />
    </SettingsLayout>
  );
}
