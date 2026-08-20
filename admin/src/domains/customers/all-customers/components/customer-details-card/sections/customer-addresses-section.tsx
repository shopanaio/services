"use client";

import { useMemo, useState } from "react";
import { Button, Flex, Tag, Tooltip, Typography } from "antd";
import {
  LuCircleAlert as InvalidOutlined,
  LuClock as ClockOutlined,
  LuMapPin as AddressOutlined,
  LuCheck as ValidOutlined,
} from "react-icons/lu";
import type { ApiCustomer, ApiCustomerAddress } from "@/graphql/types";
import { CustomerAddressValidationStatus } from "@/graphql/types";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { CustomerEditSection } from "../../../modals";
import { useCustomerDetailsStyles } from "../customer-details-card.styles";
import { compactParts, formatCountry, formatCustomerDateTime } from "../customer-details-utils";

const validation = {
  [CustomerAddressValidationStatus.Valid]: {
    color: "green",
    icon: <ValidOutlined />,
    label: "Valid",
  },
  [CustomerAddressValidationStatus.Unvalidated]: {
    color: "gold",
    icon: <ClockOutlined />,
    label: "Unvalidated",
  },
  [CustomerAddressValidationStatus.Invalid]: {
    color: "red",
    icon: <InvalidOutlined />,
    label: "Invalid",
  },
} as const;

function AddressCard({ address }: { address: ApiCustomerAddress }) {
  const { styles } = useCustomerDetailsStyles();
  const state = validation[address.validationStatus];
  const identity = compactParts(
    [
      address.companyName,
      compactParts(
        [address.prefix, address.firstName, address.middleName, address.lastName, address.suffix],
        " ",
      ),
    ],
    "\n",
  );
  const locality = compactParts(
    [
      address.city,
      compactParts([address.regionName, address.regionCode], " / "),
      address.postalCode,
      formatCountry(address.countryCode),
    ],
    ", ",
  );

  const statusTag = (
    <Tag color={state.color} icon={state.icon}>
      {state.label}
    </Tag>
  );
  return (
    <div className={styles.addressCard}>
      <Flex justify="space-between" align="flex-start" gap="small" wrap="wrap">
        <Typography.Text strong>{address.label || "Address"}</Typography.Text>
        <Flex gap={4} wrap="wrap">
          {address.isDefaultShipping ? <Tag color="blue">Shipping default</Tag> : null}
          {address.isDefaultBilling ? <Tag color="purple">Billing default</Tag> : null}
          {address.validatedAt ? (
            <Tooltip title={`Validated ${formatCustomerDateTime(address.validatedAt)}`}>
              {statusTag}
            </Tooltip>
          ) : (
            statusTag
          )}
        </Flex>
      </Flex>
      <Flex vertical gap={4} style={{ marginTop: 12 }}>
        {identity ? (
          <Typography.Text className={styles.addressText}>{identity}</Typography.Text>
        ) : null}
        <Typography.Text className={styles.addressText}>
          {compactParts([address.address1, address.address2], "\n")}
        </Typography.Text>
        {locality ? <Typography.Text>{locality}</Typography.Text> : null}
        {address.phoneE164 ? (
          <Typography.Text copyable={{ text: address.phoneE164 }}>
            {address.phoneE164}
          </Typography.Text>
        ) : null}
      </Flex>
    </div>
  );
}

export function CustomerAddressesSection({
  customer,
  onEdit,
}: {
  customer: ApiCustomer;
  onEdit: (section: CustomerEditSection) => void;
}) {
  const { styles } = useCustomerDetailsStyles();
  const [expanded, setExpanded] = useState(false);
  const addresses = useMemo(
    () =>
      customer.addresses.edges
        .map((edge) => edge.node)
        .sort(
          (left, right) =>
            Number(right.isDefaultShipping || right.isDefaultBilling) -
            Number(left.isDefaultShipping || left.isDefaultBilling),
        ),
    [customer.addresses.edges],
  );
  const visible = expanded ? addresses : addresses.slice(0, 3);
  const truncated = customer.addresses.totalCount > addresses.length;

  return (
    <Paper data-testid="customer-addresses-section">
      <PaperHeader
        title={`Addresses (${customer.addresses.totalCount})`}
        actions={
          <EditAction
            label="Manage addresses"
            onEdit={() => onEdit("addresses")}
            testId="customer-addresses-actions"
          />
        }
      />
      {addresses.length ? (
        <>
          <div className={styles.addressGrid}>
            {visible.map((address) => (
              <AddressCard key={address.id} address={address} />
            ))}
          </div>
          {!expanded && addresses.length > 3 ? (
            <Button type="link" className={styles.showAll} onClick={() => setExpanded(true)}>
              Show all addresses ({addresses.length})
            </Button>
          ) : null}
          {truncated ? (
            <Typography.Text type="secondary" className={styles.truncated}>
              Showing {addresses.length} of {customer.addresses.totalCount}
            </Typography.Text>
          ) : null}
        </>
      ) : (
        <EntityDetailsEmptyState
          state={{ title: "No addresses added" }}
          icon={<AddressOutlined />}
        />
      )}
    </Paper>
  );
}
