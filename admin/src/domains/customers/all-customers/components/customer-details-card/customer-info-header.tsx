"use client";

import { useState } from "react";
import { Avatar, Button, Divider, Dropdown, Flex, Tag, Tooltip, Typography } from "antd";
import {
  LuBadgeCheck as VerifiedOutlined,
  LuBan as BlockedOutlined,
  LuCheck as CheckOutlined,
  LuEllipsis as MoreOutlined,
  LuLink as LinkOutlined,
  LuLock as LockOutlined,
  LuMerge as MergeOutlined,
  LuPause as PauseOutlined,
  LuUser as UserOutlined,
} from "react-icons/lu";
import type { ApiCustomer } from "@/graphql/types";
import { CustomerLifecycleStatus } from "@/graphql/types";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import { KPITile } from "@/ui-kit/kpi-tile";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { CustomerEditSection } from "../../modals";
import { useCustomerDetailsStyles } from "./customer-details-card.styles";
import {
  compactParts,
  customerInitials,
  enumLabel,
  formatCustomerDate,
  formatCustomerMoney,
  formatCustomerSource,
  shortCustomerId,
} from "./customer-details-utils";

interface CustomerInfoHeaderProps {
  customer: ApiCustomer;
  currency: string | null;
  onEdit: (section: CustomerEditSection) => void;
  onTechnicalMetadata: () => void;
  onMerge: () => void;
  onCreateDataRequest: () => void;
  onDelete: () => void;
}

const lifecycle = {
  [CustomerLifecycleStatus.Active]: {
    color: "green",
    icon: <CheckOutlined />,
    hint: "Customer can participate in normal store flows",
  },
  [CustomerLifecycleStatus.Disabled]: {
    color: "default",
    icon: <PauseOutlined />,
    hint: "Customer account is disabled by an administrator",
  },
  [CustomerLifecycleStatus.Blocked]: {
    color: "red",
    icon: <BlockedOutlined />,
    hint: "Customer is blocked; see account details for the reason",
  },
  [CustomerLifecycleStatus.Merged]: {
    color: "purple",
    icon: <MergeOutlined />,
    hint: "Profile was merged into another customer",
  },
  [CustomerLifecycleStatus.Redacted]: {
    color: "default",
    icon: <LockOutlined />,
    hint: "Personal data was redacted by a privacy workflow",
  },
} as const;

function VerificationIcon({ type, verified }: { type: "Email" | "Phone"; verified: boolean }) {
  const label = `${type} ${verified ? "verified" : "not verified"}`;
  return (
    <Tooltip title={label}>
      <span aria-label={label} role="img">
        <VerifiedOutlined style={{ color: verified ? "var(--ant-color-success)" : "var(--ant-color-text-tertiary)" }} />
      </span>
    </Tooltip>
  );
}

export function CustomerInfoHeader({
  customer,
  currency,
  onEdit,
  onTechnicalMetadata,
  onMerge,
  onCreateDataRequest,
  onDelete,
}: CustomerInfoHeaderProps) {
  const { styles } = useCustomerDetailsStyles();
  const [linkCopied, setLinkCopied] = useState(false);
  const status = lifecycle[customer.lifecycleStatus];
  const terminal = customer.lifecycleStatus === CustomerLifecycleStatus.Merged || customer.lifecycleStatus === CustomerLifecycleStatus.Redacted;
  const money = customer.monetaryStatistics.edges[0]?.node ?? null;
  const meta = compactParts([
    `Customer since ${formatCustomerDate(customer.createdAt)}`,
    `Updated ${formatCustomerDate(customer.updatedAt)}`,
    formatCustomerSource(customer.source),
  ]);

  const copyAdminLink = async () => {
    if (typeof window === "undefined") return;
    await navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1500);
  };

  const menuItems = [
    { key: "profile", label: "Edit personal profile", "data-testid": "customer-edit-profile-menu-item", onClick: () => onEdit("profile") },
    { key: "contact", label: "Edit contact details", "data-testid": "customer-edit-contact-menu-item", onClick: () => onEdit("contact") },
    { key: "company", label: "Edit company", "data-testid": "customer-edit-company-menu-item", onClick: () => onEdit("company") },
    { key: "addresses", label: "Manage addresses", "data-testid": "customer-manage-addresses-menu-item", onClick: () => onEdit("addresses") },
    { type: "divider" as const },
    { key: "consents", label: "Edit marketing consents", "data-testid": "customer-edit-consents-menu-item", onClick: () => onEdit("consents") },
    { key: "groups", label: "Edit customer groups", "data-testid": "customer-edit-groups-menu-item", onClick: () => onEdit("groups") },
    { key: "tags", label: "Edit customer tags", "data-testid": "customer-edit-tags-menu-item", onClick: () => onEdit("tags") },
    { key: "segments", label: "Edit manual segments", "data-testid": "customer-edit-segments-menu-item", onClick: () => onEdit("segments") },
    { type: "divider" as const },
    { key: "status", label: "Change customer status", "data-testid": "customer-edit-status-menu-item", disabled: terminal, onClick: () => onEdit("status") },
    { key: "note", label: "Edit merchant note", "data-testid": "customer-edit-note-menu-item", onClick: () => onEdit("note") },
    { key: "moderation", label: "Edit moderation note", "data-testid": "customer-edit-moderation-menu-item", onClick: () => onEdit("moderation") },
    { key: "tax-identifiers", label: "Manage tax identifiers", "data-testid": "customer-manage-tax-identifiers-menu-item", onClick: () => onEdit("taxIdentifiers") },
    { key: "tax-exemptions", label: "Manage tax exemptions", "data-testid": "customer-manage-tax-exemptions-menu-item", onClick: () => onEdit("taxExemptions") },
    { key: "metadata", label: "View technical metadata", "data-testid": "customer-technical-metadata-menu-item", onClick: onTechnicalMetadata },
    { type: "divider" as const },
    { key: "merge", label: "Merge customer", "data-testid": "customer-merge-menu-item", onClick: onMerge },
    { key: "privacy", label: "Create privacy request", "data-testid": "customer-privacy-request-menu-item", onClick: onCreateDataRequest },
    { type: "divider" as const },
    { key: "delete", label: "Delete customer", danger: true, "data-testid": "customer-delete-menu-item", onClick: onDelete },
  ];

  return (
    <Paper data-testid="customer-header-section">
      <PaperHeader
        title={(
          <Flex align="center" gap={8} className={styles.headerMeta}>
            <Tooltip title={status.hint}>
              <Tag color={status.color} icon={status.icon} className={styles.statusTag}>
                {customer.lifecycleStatus}
              </Tag>
            </Tooltip>
            <Typography.Text type="secondary" className={styles.metaText}>{meta}</Typography.Text>
          </Flex>
        )}
        actions={(
          <Flex align="center" gap={8} className={styles.headerActions}>
            <Tooltip title={linkCopied ? "Copied" : "Copy current Admin URL"}>
              <Button
                size="small"
                variant="text"
                color="default"
                icon={linkCopied ? <CheckOutlined /> : <LinkOutlined />}
                aria-label="Copy current Admin URL"
                onClick={() => void copyAdminLink()}
                className={styles.iconButton}
              />
            </Tooltip>
            <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
              <Button size="small" icon={<MoreOutlined />} aria-label="Customer actions" data-testid="customer-actions-button" />
            </Dropdown>
          </Flex>
        )}
      />

      <Flex gap="middle" align="center" className={styles.identity}>
        <Avatar size={56} className={styles.avatar}>
          {customerInitials(customer.firstName, customer.lastName) || <UserOutlined />}
        </Avatar>
        <Flex vertical gap={6} className={styles.identity}>
          <Typography.Title level={3} ellipsis={{ rows: 2 }} className={styles.customerTitle}>
            {customer.displayName || "Unnamed customer"}
          </Typography.Title>
          <Flex align="center" gap={12} wrap="wrap" className={styles.contactLine}>
            {customer.email ? (
              <span className={styles.contact}>
                <Typography.Text copyable={{ text: customer.email }}>{customer.email}</Typography.Text>
                <VerificationIcon type="Email" verified={customer.emailVerified} />
              </span>
            ) : null}
            {customer.phoneE164 ? (
              <span className={styles.contact}>
                <Typography.Text copyable={{ text: customer.phoneE164 }}>{customer.phoneE164}</Typography.Text>
                <VerificationIcon type="Phone" verified={customer.phoneVerified} />
              </span>
            ) : null}
          </Flex>
          <Flex gap={8} wrap="wrap">
            <Tag>{enumLabel(customer.accountStatus)}</Tag>
            <CopyableChip label="ID" value={customer.id} displayValue={shortCustomerId(customer.id)} mono />
          </Flex>
        </Flex>
      </Flex>

      <Divider className={styles.divider} />
      <div className={styles.kpiGrid}>
        <KPITile label="Orders" value={customer.statistics?.ordersCount ?? 0} centered className={styles.kpiTile} />
        <KPITile label="Net spent" value={formatCustomerMoney(money?.netSpentMinor, currency)} centered className={styles.kpiTile} />
        <KPITile label="Avg. order" value={formatCustomerMoney(money?.averageOrderValueMinor, currency)} centered className={styles.kpiTile} />
        <KPITile label="Returns" value={customer.statistics?.returnsCount ?? 0} centered className={styles.kpiTile} />
      </div>
    </Paper>
  );
}
