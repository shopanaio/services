"use client";

import { useMemo } from "react";
import {
  App,
  Avatar,
  Button,
  Descriptions,
  Dropdown,
  Empty,
  Flex,
  List,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { LuTrash2 as DeleteOutlined, LuPencil as EditOutlined, LuMapPin as EnvironmentOutlined, LuFileLock2 as FileProtectOutlined, LuMail as MailOutlined, LuMerge as MergeCellsOutlined, LuEllipsis as MoreOutlined, LuBadgeCheck as SafetyCertificateOutlined, LuShoppingBag as ShoppingOutlined, LuBan as StopOutlined, LuTags as TagsOutlined, LuUsers as TeamOutlined, LuUser as UserOutlined } from "react-icons/lu";
import type { ApiCustomer } from "@/graphql/types";
import {
  CustomerConsentState,
  CustomerLifecycleStatus,
} from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import { useDefaultCurrency } from "@/domains/workspace";
import type { CustomerEditSection } from "../../modals";

interface CustomerDetailsCardProps {
  customer: ApiCustomer;
  onEdit: (section: CustomerEditSection) => void;
  onDelete: () => Promise<void> | void;
  onMerge: () => void;
  onCreateDataRequest: () => void;
}

const lifecycleColor: Record<CustomerLifecycleStatus, string> = {
  [CustomerLifecycleStatus.Active]: "green",
  [CustomerLifecycleStatus.Disabled]: "default",
  [CustomerLifecycleStatus.Blocked]: "red",
  [CustomerLifecycleStatus.Merged]: "purple",
  [CustomerLifecycleStatus.Redacted]: "default",
};

function formatDate(value?: string | null): string {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}

function formatDateOnly(value?: string | null): string {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value)) : "—";
}

function formatMoney(value: unknown, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(Number(value ?? 0) / 100);
}

function EmptyBlock({ description }: { description: string }) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />;
}

export function CustomerDetailsCard({ customer, onEdit, onDelete, onMerge, onCreateDataRequest }: CustomerDetailsCardProps) {
  const { modal } = App.useApp();
  const defaultCurrency = useDefaultCurrency();
  const fallbackCurrency = defaultCurrency ?? "USD";
  const initials = `${customer.firstName?.[0] ?? ""}${customer.lastName?.[0] ?? ""}`.toUpperCase();
  const defaultMoney = customer.monetaryStatistics.edges.find((edge) => edge.node.currencyCode === defaultCurrency)?.node
    ?? customer.monetaryStatistics.edges[0]?.node;
  const groups = customer.groupMemberships.edges.map((edge) => edge.node);
  const segments = customer.segmentMemberships.edges.map((edge) => edge.node);
  const tags = customer.tagAssignments.edges.map((edge) => edge.node);
  const addresses = customer.addresses.edges.map((edge) => edge.node);
  const taxIdentifiers = customer.taxIdentifiers.edges.map((edge) => edge.node);
  const taxExemptions = customer.taxExemptions.edges.map((edge) => edge.node);
  const statusLabel = customer.lifecycleStatus.toLowerCase().replaceAll("_", " ");
  const contactItems = useMemo(() => [
    { key: "email", label: "Email", children: customer.email ?? "—" },
    { key: "email-verified", label: "Email verified", children: customer.emailVerified ? "Yes" : "No" },
    { key: "phone", label: "Phone", children: customer.phoneE164 ?? "—" },
    { key: "phone-verified", label: "Phone verified", children: customer.phoneVerified ? "Yes" : "No" },
  ], [customer]);

  const confirmDelete = () => {
    modal.confirm({
      title: "Delete customer?",
      content: `${customer.displayName} will no longer be available in the store.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: onDelete,
    });
  };

  return (
    <Flex vertical gap={12} style={{ width: "100%" }} data-testid="customer-details-card">
      <Paper data-testid="customer-header-section">
        <Flex justify="space-between" align="flex-start" gap="middle" wrap="wrap">
          <Flex gap="middle" align="center">
            <Avatar size={56}>{initials || <UserOutlined />}</Avatar>
            <Flex vertical gap={4}>
              <Typography.Title level={3} style={{ margin: 0 }}>{customer.displayName}</Typography.Title>
              <Flex gap={6} wrap="wrap">
                <Tag color={lifecycleColor[customer.lifecycleStatus]}>{statusLabel}</Tag>
                <Tag>{customer.accountStatus.toLowerCase()}</Tag>
                {customer.emailVerified ? <Tag color="green">Email verified</Tag> : null}
                {customer.phoneVerified ? <Tag color="green">Phone verified</Tag> : null}
              </Flex>
              <Typography.Text type="secondary">Updated {formatDate(customer.updatedAt)}</Typography.Text>
            </Flex>
          </Flex>
          <Flex gap="small">
            <Button icon={<EditOutlined />} onClick={() => onEdit("profile")}>Edit profile</Button>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  { key: "status", label: "Change status", icon: <StopOutlined />, onClick: () => onEdit("status") },
                  { key: "merge", label: "Merge customer", icon: <MergeCellsOutlined />, onClick: onMerge },
                  { key: "privacy", label: "Create privacy request", icon: <FileProtectOutlined />, onClick: onCreateDataRequest },
                  { type: "divider" },
                  { key: "delete", label: "Delete customer", danger: true, icon: <DeleteOutlined />, onClick: confirmDelete },
                ],
              }}
            >
              <Button icon={<MoreOutlined />} data-testid="customer-actions-button" />
            </Dropdown>
          </Flex>
        </Flex>
      </Paper>

      <Paper data-testid="customer-activity-section">
        <PaperHeader title="Activity & value" icon={<ShoppingOutlined />} />
        <Flex gap="large" wrap="wrap">
          <Statistic title="Orders" value={customer.statistics?.ordersCount ?? 0} />
          <Statistic title="Completed" value={customer.statistics?.completedOrdersCount ?? 0} />
          <Statistic title="Cancelled" value={customer.statistics?.cancelledOrdersCount ?? 0} />
          <Statistic title="Returns" value={customer.statistics?.returnsCount ?? 0} />
          <Statistic title="Total spent" value={defaultMoney ? formatMoney(defaultMoney.totalSpentMinor, defaultMoney.currencyCode) : formatMoney(0, fallbackCurrency)} />
          <Statistic title="Net spent" value={defaultMoney ? formatMoney(defaultMoney.netSpentMinor, defaultMoney.currencyCode) : formatMoney(0, fallbackCurrency)} />
        </Flex>
        <Descriptions style={{ marginTop: 16 }} size="small" column={{ xs: 1, sm: 2, lg: 3 }} items={[
          { key: "first", label: "First order", children: formatDate(customer.statistics?.firstOrderAt) },
          { key: "last", label: "Last order", children: formatDate(customer.statistics?.lastOrderAt) },
          { key: "checkout", label: "Last checkout", children: formatDate(customer.statistics?.lastCheckoutAt) },
        ]} />
      </Paper>

      <Paper data-testid="customer-profile-section">
        <PaperHeader title="Profile & contacts" icon={<UserOutlined />} actions={<EditAction label="Edit profile" onEdit={() => onEdit("profile")} />} />
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} items={[
          { key: "name", label: "Full name", children: [customer.prefix, customer.firstName, customer.middleName, customer.lastName, customer.suffix].filter(Boolean).join(" ") || "—" },
          { key: "dob", label: "Date of birth", children: formatDateOnly(customer.dateOfBirth) },
          { key: "gender", label: "Gender", children: customer.gender ?? "—" },
          { key: "locale", label: "Preferred locale", children: customer.preferredLocale ?? "—" },
          ...contactItems,
        ]} />
      </Paper>

      <Paper data-testid="customer-company-section">
        <PaperHeader title="Company" icon={<TeamOutlined />} actions={<EditAction label="Edit company" onEdit={() => onEdit("company")} />} />
        <Descriptions column={{ xs: 1, sm: 2 }} items={[
          { key: "company", label: "Company", children: customer.companyName ?? "—" },
          { key: "job", label: "Job title", children: customer.jobTitle ?? "—" },
        ]} />
      </Paper>

      <Paper data-testid="customer-addresses-section">
        <PaperHeader title={`Addresses (${customer.addresses.totalCount})`} icon={<EnvironmentOutlined />} actions={<EditAction label="Manage addresses" onEdit={() => onEdit("addresses")} />} />
        {addresses.length === 0 ? <EmptyBlock description="No addresses" /> : (
          <List dataSource={addresses} renderItem={(address) => (
            <List.Item>
              <List.Item.Meta
                title={<Flex gap={6} wrap="wrap"><span>{address.label || [address.firstName, address.lastName].filter(Boolean).join(" ") || "Address"}</span>{address.isDefaultShipping ? <Tag color="blue">Shipping default</Tag> : null}{address.isDefaultBilling ? <Tag color="purple">Billing default</Tag> : null}</Flex>}
                description={[address.address1, address.address2, address.city, address.regionName, address.postalCode, address.countryCode].filter(Boolean).join(", ")}
              />
              <Tag>{address.validationStatus.toLowerCase()}</Tag>
            </List.Item>
          )} />
        )}
      </Paper>

      <Paper data-testid="customer-classification-section">
        <PaperHeader title="Classification" icon={<TagsOutlined />} actions={<EditAction label="Edit classification" onEdit={() => onEdit("classification")} />} />
        <Descriptions column={1} items={[
          { key: "groups", label: "Groups", children: groups.length ? <Flex gap={4} wrap="wrap">{groups.map((membership) => <Tag key={membership.id} color={membership.isPrimary ? "blue" : undefined}>{membership.group.name}{membership.isPrimary ? " · primary" : ""}</Tag>)}</Flex> : "—" },
          { key: "tags", label: "Tags", children: tags.length ? <Flex gap={4} wrap="wrap">{tags.map((assignment) => <Tag key={assignment.id}>{assignment.tag.name}</Tag>)}</Flex> : "—" },
          { key: "segments", label: "Segments", children: segments.length ? <Flex gap={4} wrap="wrap">{segments.map((membership) => <Tag key={membership.id} color={membership.segment.color ?? undefined}>{membership.segment.name} · {membership.source.toLowerCase()}</Tag>)}</Flex> : "—" },
        ]} />
      </Paper>

      <Paper data-testid="customer-consents-section">
        <PaperHeader title="Marketing consents" icon={<MailOutlined />} actions={<EditAction label="Edit consents" onEdit={() => onEdit("consents")} />} />
        {customer.consents.length === 0 ? <EmptyBlock description="No consent records" /> : (
          <List dataSource={customer.consents} renderItem={(consent) => (
            <List.Item>
              <List.Item.Meta
                title={<Flex gap={6}><Typography.Text strong>{consent.channel}</Typography.Text><Tag color={consent.state === CustomerConsentState.Subscribed ? "green" : undefined}>{consent.state.toLowerCase().replaceAll("_", " ")}</Tag></Flex>}
                description={(
                  <Flex vertical gap={2}>
                    <span>{consent.contactPoint} · {consent.optInLevel.toLowerCase().replaceAll("_", " ")} · updated {formatDate(consent.updatedAt)}</span>
                    {consent.events.edges[0]?.node ? (
                      <Typography.Text type="secondary">
                        Latest: {consent.events.edges[0].node.previousState?.toLowerCase().replaceAll("_", " ") ?? "none"} → {consent.events.edges[0].node.newState.toLowerCase().replaceAll("_", " ")} · {formatDate(consent.events.edges[0].node.occurredAt)}
                      </Typography.Text>
                    ) : null}
                  </Flex>
                )}
              />
              <Typography.Text type="secondary">{consent.events.totalCount} events</Typography.Text>
            </List.Item>
          )} />
        )}
      </Paper>

      <Paper data-testid="customer-tax-section">
        <PaperHeader title="Tax" icon={<SafetyCertificateOutlined />} actions={<EditAction label="Manage tax data" onEdit={() => onEdit("tax")} />} />
        <Typography.Title level={5}>Identifiers</Typography.Title>
        {taxIdentifiers.length === 0 ? <Typography.Text type="secondary">No tax identifiers</Typography.Text> : (
          <List size="small" dataSource={taxIdentifiers} renderItem={(item) => <List.Item><Typography.Text>{item.identifierType}: {item.value}</Typography.Text><Flex gap={4}>{item.isPrimary ? <Tag color="blue">Primary</Tag> : null}<Tag>{item.status.toLowerCase()}</Tag></Flex></List.Item>} />
        )}
        <Typography.Title level={5} style={{ marginTop: 20 }}>Exemptions</Typography.Title>
        {taxExemptions.length === 0 ? <Typography.Text type="secondary">No tax exemptions</Typography.Text> : (
          <List size="small" dataSource={taxExemptions} renderItem={(item) => <List.Item><List.Item.Meta title={item.code} description={<Flex vertical gap={2}><span>{[item.countryCode, item.regionCode, item.reason].filter(Boolean).join(" · ")}</span>{item.certificateFile ? <a href={item.certificateFile.url} target="_blank" rel="noreferrer">{item.certificateFile.originalName ?? "Open certificate"}</a> : null}</Flex>} /><Tag>{item.status.toLowerCase()}</Tag></List.Item>} />
        )}
      </Paper>

      <Paper data-testid="customer-notes-section">
        <PaperHeader title="Notes & moderation" icon={<StopOutlined />} actions={<EditAction label="Edit notes" onEdit={() => onEdit("notes")} />} />
        <Descriptions column={1} items={[
          { key: "note", label: "Merchant note", children: customer.note || "—" },
          { key: "moderation", label: "Moderation note", children: customer.moderationNote || "—" },
          { key: "blocked", label: "Blocked reason", children: customer.blockedReason || "—" },
        ]} />
      </Paper>

      <Paper data-testid="customer-lifecycle-section">
        <PaperHeader title="Lifecycle" icon={<FileProtectOutlined />} />
        <Descriptions column={{ xs: 1, sm: 2 }} items={[
          { key: "merged", label: "Merged into", children: customer.mergedInto ? `${customer.mergedInto.displayName} (${customer.mergedInto.email ?? customer.mergedInto.id})` : "—" },
          { key: "redacted", label: "Redacted", children: formatDate(customer.redactedAt) },
          { key: "deleted", label: "Deleted", children: formatDate(customer.deletedAt) },
          { key: "activity", label: "Last activity", children: formatDate(customer.lastActivityAt) },
        ]} />
      </Paper>

      <Paper data-testid="customer-audit-section">
        <PaperHeader title="Audit metadata" />
        <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} items={[
          { key: "id", label: "Customer ID", children: <Typography.Text copyable>{customer.id}</Typography.Text> },
          { key: "iam", label: "IAM principal", children: customer.iamPrincipalId ? <Typography.Text copyable>{customer.iamPrincipalId}</Typography.Text> : "—" },
          { key: "source", label: "Source", children: customer.source },
          { key: "created-by", label: "Created by", children: customer.createdByUserId ?? "—" },
          { key: "created", label: "Created", children: formatDate(customer.createdAt) },
          { key: "updated", label: "Updated", children: formatDate(customer.updatedAt) },
          { key: "revision", label: "Revision", children: customer.revision },
        ]} />
      </Paper>
    </Flex>
  );
}
