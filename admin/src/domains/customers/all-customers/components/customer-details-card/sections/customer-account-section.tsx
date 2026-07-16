import { Divider, Flex, Tag, Typography } from "antd";
import { LuBan as BlockedOutlined, LuCheck as ActiveOutlined, LuLock as LockOutlined, LuMerge as MergeOutlined, LuPause as DisabledOutlined } from "react-icons/lu";
import type { ApiCustomer } from "@/graphql/types";
import { CustomerLifecycleStatus } from "@/graphql/types";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { CustomerEditSection } from "../../../modals";
import { useCustomerDetailsStyles } from "../customer-details-card.styles";
import { formatCustomerDate, shortCustomerId } from "../customer-details-utils";

export function CustomerAccountSection({ customer, onEdit }: { customer: ApiCustomer; onEdit: (section: CustomerEditSection) => void }) {
  const { styles, cx } = useCustomerDetailsStyles();
  const terminal = customer.lifecycleStatus === CustomerLifecycleStatus.Merged || customer.lifecycleStatus === CustomerLifecycleStatus.Redacted;
  const items = [
    { key: "status", label: "Change customer status", "data-testid": "customer-account-status-menu-item", disabled: terminal, onClick: () => onEdit("status") },
    { key: "note", label: "Edit merchant note", "data-testid": "customer-account-note-menu-item", onClick: () => onEdit("note") },
    { key: "moderation", label: "Edit moderation note", "data-testid": "customer-account-moderation-menu-item", onClick: () => onEdit("moderation") },
  ];

  return (
    <Paper data-testid="customer-account-section">
      <PaperHeader title="Account & notes" actions={<EditAction onEdit={() => onEdit("status")} items={items} testId="customer-account-actions" />} />
      <Typography.Text strong>Account status</Typography.Text>
      {terminal ? (
        <div className={styles.terminalPanel} style={{ marginTop: 8 }}>
          <Flex align="center" gap={8} wrap="wrap">
            {customer.lifecycleStatus === CustomerLifecycleStatus.Merged ? <MergeOutlined /> : <LockOutlined />}
            <Typography.Text strong>{customer.lifecycleStatus === CustomerLifecycleStatus.Merged ? "Customer merged" : "Personal data redacted"}</Typography.Text>
            {customer.mergedInto ? <CopyableChip label="Target" value={customer.mergedInto.id} displayValue={customer.mergedInto.displayName || shortCustomerId(customer.mergedInto.id)} /> : null}
            {customer.redactedAt ? <Typography.Text type="secondary">{formatCustomerDate(customer.redactedAt)}</Typography.Text> : null}
          </Flex>
        </div>
      ) : (
        <div className={styles.statusStrip} style={{ marginTop: 8 }} aria-label={`Current account status: ${customer.lifecycleStatus}`}>
          <div className={cx(styles.statusSegment, customer.lifecycleStatus === CustomerLifecycleStatus.Active && styles.statusSegmentActive, customer.lifecycleStatus === CustomerLifecycleStatus.Active && styles.statusSegmentSuccess)}><ActiveOutlined /> Active</div>
          <div className={cx(styles.statusSegment, customer.lifecycleStatus === CustomerLifecycleStatus.Disabled && styles.statusSegmentActive, customer.lifecycleStatus === CustomerLifecycleStatus.Disabled && styles.statusSegmentDisabled)}><DisabledOutlined /> Disabled</div>
          <div className={cx(styles.statusSegment, customer.lifecycleStatus === CustomerLifecycleStatus.Blocked && styles.statusSegmentActive, customer.lifecycleStatus === CustomerLifecycleStatus.Blocked && styles.statusSegmentBlocked)}><BlockedOutlined /> Blocked</div>
        </div>
      )}
      {customer.lifecycleStatus === CustomerLifecycleStatus.Blocked && customer.blockedReason ? <Typography.Paragraph style={{ marginTop: 12, marginBottom: 0 }}><Typography.Text strong>Blocked reason: </Typography.Text>{customer.blockedReason}</Typography.Paragraph> : null}
      <Divider className={styles.sectionDivider} />
      <div className={styles.noteBlock}>
        <Typography.Text strong>Merchant note</Typography.Text>
        <Typography.Paragraph style={{ marginTop: 4, marginBottom: 0 }} type={customer.note ? undefined : "secondary"}>{customer.note || "No merchant note"}</Typography.Paragraph>
      </div>
      <Divider className={styles.sectionDivider} />
      <div className={styles.noteBlock}>
        <Typography.Text strong>Internal moderation note</Typography.Text>
        <Typography.Paragraph style={{ marginTop: 4, marginBottom: 0 }} type={customer.moderationNote ? undefined : "secondary"}>{customer.moderationNote || "No moderation note"}</Typography.Paragraph>
      </div>
      {customer.deletedAt ? <><Divider className={styles.sectionDivider} /><Tag color="red">Deleted {formatCustomerDate(customer.deletedAt)}</Tag></> : null}
    </Paper>
  );
}
