import { Flex, Tag, Typography } from "antd";
import {
  LuLock as LockOutlined,
  LuMail as MailOutlined,
  LuMessageSquare as SmsOutlined,
} from "react-icons/lu";
import type { ApiCustomer } from "@/graphql/types";
import { CustomerConsentChannel, CustomerConsentState } from "@/graphql/types";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { CustomerEditSection } from "../../../modals";
import { useCustomerDetailsStyles } from "../customer-details-card.styles";
import { compactParts, enumLabel, formatCustomerDate } from "../customer-details-utils";

const stateColor: Partial<Record<CustomerConsentState, string>> = {
  [CustomerConsentState.Subscribed]: "green",
  [CustomerConsentState.Pending]: "gold",
  [CustomerConsentState.Invalid]: "red",
};

export function CustomerConsentsSection({
  customer,
  onEdit,
}: {
  customer: ApiCustomer;
  onEdit: (section: CustomerEditSection) => void;
}) {
  const { styles } = useCustomerDetailsStyles();
  return (
    <Paper data-testid="customer-consents-section">
      <PaperHeader
        title="Marketing consents"
        actions={
          <EditAction
            label="Edit marketing consents"
            onEdit={() => onEdit("consents")}
            testId="customer-consents-actions"
          />
        }
      />
      {customer.consents.length ? (
        customer.consents.map((consent) => {
          const latest = consent.events.edges[0]?.node;
          const channelLabel = enumLabel(consent.channel);
          return (
            <div key={consent.id} className={styles.consentRow}>
              <div className={styles.channelIcon}>
                {consent.channel === CustomerConsentChannel.Email ? (
                  <MailOutlined />
                ) : (
                  <SmsOutlined />
                )}
              </div>
              <Flex vertical gap={4}>
                <Flex align="center" gap={8} wrap="wrap">
                  <Typography.Text strong>{channelLabel}</Typography.Text>
                  <Tag
                    color={stateColor[consent.state]}
                    icon={
                      consent.state === CustomerConsentState.Redacted ? <LockOutlined /> : undefined
                    }
                  >
                    {enumLabel(consent.state).toUpperCase()}
                  </Tag>
                </Flex>
                <Typography.Text>
                  {compactParts([
                    consent.contactPoint,
                    enumLabel(consent.optInLevel),
                    `Updated ${formatCustomerDate(consent.updatedAt)}`,
                  ])}
                </Typography.Text>
                {latest ? (
                  <Typography.Text type="secondary">
                    Latest transition: {enumLabel(latest.previousState) || "None"} →{" "}
                    {enumLabel(latest.newState)} · {formatCustomerDate(latest.occurredAt)}
                  </Typography.Text>
                ) : null}
              </Flex>
            </div>
          );
        })
      ) : (
        <EntityDetailsEmptyState
          state={{ title: "No marketing consent records" }}
          icon={<MailOutlined />}
        />
      )}
    </Paper>
  );
}
