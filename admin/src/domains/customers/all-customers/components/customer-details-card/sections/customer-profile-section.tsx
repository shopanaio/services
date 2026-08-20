import { Divider, Flex, Typography } from "antd";
import type { ApiCustomer } from "@/graphql/types";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { CustomerEditSection } from "../../../modals";
import { useCustomerDetailsStyles } from "../customer-details-card.styles";
import { compactParts, formatCustomerDate, formatLocale } from "../customer-details-utils";

export function CustomerProfileSection({
  customer,
  onEdit,
}: {
  customer: ApiCustomer;
  onEdit: (section: CustomerEditSection) => void;
}) {
  const { styles } = useCustomerDetailsStyles();
  const fullName = compactParts(
    [customer.prefix, customer.firstName, customer.middleName, customer.lastName, customer.suffix],
    " ",
  );
  const personalMeta = compactParts([
    customer.dateOfBirth ? `Born ${formatCustomerDate(customer.dateOfBirth)}` : null,
    customer.gender,
    formatLocale(customer.preferredLocale),
  ]);
  const company = compactParts([customer.companyName, customer.jobTitle]);
  const items = [
    {
      key: "profile",
      label: "Edit personal profile",
      "data-testid": "customer-profile-edit-menu-item",
      onClick: () => onEdit("profile"),
    },
    {
      key: "contact",
      label: "Edit contact details",
      "data-testid": "customer-contact-edit-menu-item",
      onClick: () => onEdit("contact"),
    },
    {
      key: "company",
      label: "Edit company",
      "data-testid": "customer-company-edit-menu-item",
      onClick: () => onEdit("company"),
    },
  ];

  return (
    <Paper data-testid="customer-profile-section">
      <PaperHeader
        title="Customer profile"
        actions={
          <EditAction
            onEdit={() => onEdit("profile")}
            items={items}
            testId="customer-profile-actions"
          />
        }
      />
      <Typography.Text className={styles.subsectionLabel}>Personal</Typography.Text>
      <Typography.Text className={styles.primaryValue}>
        {fullName || "Unnamed customer"}
      </Typography.Text>
      {personalMeta ? <Typography.Text type="secondary">{personalMeta}</Typography.Text> : null}
      <Divider className={styles.sectionDivider} />
      <Typography.Text className={styles.subsectionLabel}>Company</Typography.Text>
      {company ? (
        <Flex vertical gap={2}>
          {customer.companyName ? (
            <Typography.Text className={styles.primaryValue}>
              {customer.companyName}
            </Typography.Text>
          ) : null}
          {customer.jobTitle ? (
            <Typography.Text type="secondary">{customer.jobTitle}</Typography.Text>
          ) : null}
        </Flex>
      ) : (
        <Typography.Text type="secondary">No company information</Typography.Text>
      )}
    </Paper>
  );
}
