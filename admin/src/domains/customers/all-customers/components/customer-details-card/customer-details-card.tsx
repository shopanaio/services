"use client";

import type { ApiCustomer } from "@/graphql/types";
import { useDefaultCurrency } from "@/domains/workspace";
import type { CustomerEditSection } from "../../modals";
import { useCustomerDetailsStyles } from "./customer-details-card.styles";
import { CustomerInfoHeader } from "./customer-info-header";
import {
  CustomerAccountSection,
  CustomerAddressesSection,
  CustomerClassificationSection,
  CustomerConsentsSection,
  CustomerOrderActivitySection,
  CustomerProfileSection,
  CustomerTaxSection,
} from "./sections";

interface CustomerDetailsCardProps {
  customer: ApiCustomer;
  onEdit: (section: CustomerEditSection) => void;
  onDelete: () => void;
  onTechnicalMetadata: () => void;
}

export function CustomerDetailsCard({
  customer,
  onEdit,
  onDelete,
  onTechnicalMetadata,
}: CustomerDetailsCardProps) {
  const { styles } = useCustomerDetailsStyles();
  const currency = useDefaultCurrency();

  return (
    <div className={styles.container} data-testid="customer-details-card">
      <CustomerInfoHeader
        customer={customer}
        currency={currency}
        onEdit={onEdit}
        onDelete={onDelete}
        onTechnicalMetadata={onTechnicalMetadata}
      />
      <CustomerProfileSection customer={customer} onEdit={onEdit} />
      <CustomerOrderActivitySection customer={customer} currency={currency} />
      <CustomerAddressesSection customer={customer} onEdit={onEdit} />
      <CustomerConsentsSection customer={customer} onEdit={onEdit} />
      <CustomerClassificationSection customer={customer} onEdit={onEdit} />
      <CustomerTaxSection customer={customer} onEdit={onEdit} />
      <CustomerAccountSection customer={customer} onEdit={onEdit} />
    </div>
  );
}
