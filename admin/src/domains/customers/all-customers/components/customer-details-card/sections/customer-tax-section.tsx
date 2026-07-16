import { Divider, Flex, Tag, Typography } from "antd";
import { LuFileText as FileOutlined } from "react-icons/lu";
import type { ApiCustomer } from "@/graphql/types";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { CustomerEditSection } from "../../../modals";
import { useCustomerDetailsStyles } from "../customer-details-card.styles";
import { compactParts, customerTaxExemptionStatusColor, customerTaxIdentifierStatusColor, formatCustomerDate } from "../customer-details-utils";

export function CustomerTaxSection({ customer, onEdit }: { customer: ApiCustomer; onEdit: (section: CustomerEditSection) => void }) {
  const { styles } = useCustomerDetailsStyles();
  const identifiers = customer.taxIdentifiers.edges.map((edge) => edge.node);
  const exemptions = customer.taxExemptions.edges.map((edge) => edge.node);
  const items = [
    { key: "identifiers", label: "Manage tax identifiers", "data-testid": "customer-tax-identifiers-menu-item", onClick: () => onEdit("taxIdentifiers") },
    { key: "exemptions", label: "Manage tax exemptions", "data-testid": "customer-tax-exemptions-menu-item", onClick: () => onEdit("taxExemptions") },
  ];

  return (
    <Paper data-testid="customer-tax-section">
      <PaperHeader title="Tax" actions={<EditAction onEdit={() => onEdit("taxIdentifiers")} items={items} testId="customer-tax-actions" />} />
      <Typography.Text strong>Identifiers ({customer.taxIdentifiers.totalCount})</Typography.Text>
      {identifiers.length ? identifiers.map((item) => (
        <div key={item.id} className={styles.taxRow}>
          <Tag color={customerTaxIdentifierStatusColor[item.status]}>{item.status}</Tag>
          <Flex align="center" gap={6} wrap="wrap">
            <Typography.Text>{compactParts([item.identifierType, item.countryCode])}</Typography.Text>
            <Typography.Text copyable={{ text: item.value }}>{item.value}</Typography.Text>
            {item.isPrimary ? <Tag color="blue">Primary</Tag> : null}
          </Flex>
          <Typography.Text type="secondary">{item.verifiedAt ? `Verified ${formatCustomerDate(item.verifiedAt)}` : item.validTo ? `Valid through ${formatCustomerDate(item.validTo)}` : "No expiry"}</Typography.Text>
        </div>
      )) : <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>No tax identifiers</Typography.Paragraph>}
      {customer.taxIdentifiers.totalCount > identifiers.length ? <Typography.Text type="secondary" className={styles.truncated}>Showing {identifiers.length} of {customer.taxIdentifiers.totalCount}</Typography.Text> : null}
      <Divider className={styles.sectionDivider} />
      <Typography.Text strong>Exemptions ({customer.taxExemptions.totalCount})</Typography.Text>
      {exemptions.length ? exemptions.map((item) => (
        <div key={item.id} className={styles.taxRow}>
          <Tag color={customerTaxExemptionStatusColor[item.status]}>{item.status}</Tag>
          <Flex vertical gap={2}>
            <Typography.Text>{compactParts([item.code, compactParts([item.countryCode, item.regionCode], " / "), item.validTo ? `Valid through ${formatCustomerDate(item.validTo)}` : null])}</Typography.Text>
            {item.reason || item.certificateFile ? (
              <Typography.Text type="secondary">
                {compactParts([item.reason, item.certificateFile?.originalName])}
                {item.certificateFile ? <a href={item.certificateFile.url} target="_blank" rel="noreferrer" aria-label="Open tax exemption certificate"> <FileOutlined /></a> : null}
              </Typography.Text>
            ) : null}
          </Flex>
          <span />
        </div>
      )) : <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>No tax exemptions</Typography.Paragraph>}
      {customer.taxExemptions.totalCount > exemptions.length ? <Typography.Text type="secondary" className={styles.truncated}>Showing {exemptions.length} of {customer.taxExemptions.totalCount}</Typography.Text> : null}
    </Paper>
  );
}
