import { Flex, Tag, Typography } from "antd";
import type { ApiCustomer } from "@/graphql/types";
import { EditAction } from "@/domains/inventory/products/components/edit-action";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import type { CustomerEditSection } from "../../../modals";
import { useCustomerDetailsStyles } from "../customer-details-card.styles";
import { enumLabel } from "../customer-details-utils";

export function CustomerClassificationSection({
  customer,
  onEdit,
}: {
  customer: ApiCustomer;
  onEdit: (section: CustomerEditSection) => void;
}) {
  const { styles } = useCustomerDetailsStyles();
  const groups = customer.groupMemberships.edges.map((edge) => edge.node);
  const tags = customer.tagAssignments.edges.map((edge) => edge.node);
  const segments = customer.segmentMemberships.edges.map((edge) => edge.node);
  const items = [
    {
      key: "groups",
      label: "Edit customer groups",
      "data-testid": "customer-groups-edit-menu-item",
      onClick: () => onEdit("groups"),
    },
    {
      key: "tags",
      label: "Edit customer tags",
      "data-testid": "customer-tags-edit-menu-item",
      onClick: () => onEdit("tags"),
    },
    {
      key: "segments",
      label: "Edit manual segments",
      "data-testid": "customer-segments-edit-menu-item",
      onClick: () => onEdit("segments"),
    },
  ];
  const truncated =
    customer.groupMemberships.totalCount > groups.length ||
    customer.tagAssignments.totalCount > tags.length ||
    customer.segmentMemberships.totalCount > segments.length;

  return (
    <Paper data-testid="customer-classification-section">
      <PaperHeader
        title="Classification"
        actions={
          <EditAction
            onEdit={() => onEdit("groups")}
            items={items}
            testId="customer-classification-actions"
          />
        }
      />
      <div className={styles.classificationRow}>
        <Typography.Text strong>Groups</Typography.Text>
        {groups.length ? (
          <Flex gap={6} wrap="wrap">
            {groups.map((membership) => (
              <Tag
                key={membership.id}
                color={membership.isPrimary ? "blue" : undefined}
                style={!membership.isActive ? { opacity: 0.55 } : undefined}
              >
                {membership.group.name} · {enumLabel(membership.source)}
                {membership.isPrimary ? " · primary" : ""}
                {!membership.isActive ? " · Inactive" : ""}
              </Tag>
            ))}
          </Flex>
        ) : (
          <Typography.Text type="secondary">No groups</Typography.Text>
        )}
      </div>
      <div className={styles.classificationRow}>
        <Typography.Text strong>Tags</Typography.Text>
        {tags.length ? (
          <Flex gap={6} wrap="wrap">
            {tags.map((assignment) => (
              <Tag key={assignment.id}>{assignment.tag.name}</Tag>
            ))}
          </Flex>
        ) : (
          <Typography.Text type="secondary">No tags</Typography.Text>
        )}
      </div>
      <div className={styles.classificationRow}>
        <Typography.Text strong>Segments</Typography.Text>
        {segments.length ? (
          <Flex gap={6} wrap="wrap">
            {segments.map((membership) => (
              <Tag
                key={membership.id}
                color={membership.segment.color ?? undefined}
                style={!membership.isActive ? { opacity: 0.55 } : undefined}
              >
                {membership.segment.name} · {enumLabel(membership.source)}
                {!membership.isActive ? " · Inactive" : ""}
              </Tag>
            ))}
          </Flex>
        ) : (
          <Typography.Text type="secondary">No segments</Typography.Text>
        )}
      </div>
      {truncated ? (
        <Typography.Text type="secondary" className={styles.truncated}>
          Some memberships are not shown because this customer has more records than the details
          page limit.
        </Typography.Text>
      ) : null}
    </Paper>
  );
}
