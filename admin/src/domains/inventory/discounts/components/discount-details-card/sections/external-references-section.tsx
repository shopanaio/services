"use client";

import { Button, Flex, Tag, Typography } from "antd";
import {
  LuArrowUpRight,
  LuDatabase,
  LuEllipsis,
  LuMail,
  LuPlug,
  LuShoppingBag,
} from "react-icons/lu";
import type { ApiDiscount } from "@/graphql/types";
import { DiscountExternalSyncStatus } from "@/graphql/types";
import { CopyableChip } from "@/ui-kit/copyable-chip";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import { DiscountSectionIcon } from "../discount-section-icon";
import { useDiscountSectionStyles } from "../discount-details-card.styles";
import {
  formatDiscountDateTime,
  formatDiscountEnum,
} from "../formatters";

interface ExternalReferencesSectionProps {
  discount: ApiDiscount;
  onEdit?: () => void;
}

const STATUS_COLORS: Record<DiscountExternalSyncStatus, string> = {
  [DiscountExternalSyncStatus.Pending]: "processing",
  [DiscountExternalSyncStatus.Synced]: "success",
  [DiscountExternalSyncStatus.Failed]: "error",
  [DiscountExternalSyncStatus.Disabled]: "default",
};

function getExternalReferenceIcon(
  system: string,
  status: DiscountExternalSyncStatus,
) {
  if (status === DiscountExternalSyncStatus.Failed) {
    return <LuDatabase />;
  }

  const normalizedSystem = system.toLowerCase();
  if (normalizedSystem.includes("shopify")) {
    return <LuShoppingBag />;
  }
  if (normalizedSystem.includes("klaviyo")) {
    return <LuMail />;
  }
  return <LuPlug />;
}

export function ExternalReferencesSection({
  discount,
  onEdit,
}: ExternalReferencesSectionProps) {
  const { styles, cx } = useDiscountSectionStyles();
  const references = discount.externalReferences.edges.map((edge) => edge.node);

  return (
    <Paper
      className={styles.section}
      data-testid="discount-external-references-section"
    >
      <PaperHeader
        title="External references"
        className={styles.compactHeader}
        extra={
          discount.externalReferences.totalCount > 0 ? (
            <Typography.Text type="secondary">
              {discount.externalReferences.totalCount}
            </Typography.Text>
          ) : undefined
        }
        actions={
          onEdit ? (
            <Button
              size="small"
              icon={<LuEllipsis />}
              aria-label="Edit external references"
              onClick={onEdit}
            />
          ) : undefined
        }
      />

      {references.length > 0 ? (
        <Flex vertical gap={8}>
          <div className={styles.codeList}>
            {references.map((reference) => (
              <div
                className={cx(
                  styles.codeRow,
                  reference.syncStatus ===
                    DiscountExternalSyncStatus.Failed &&
                    styles.externalRowWarning,
                )}
                key={reference.id}
              >
                <Flex align="flex-start" justify="space-between" gap={12}>
                  <Flex align="flex-start" gap={10} className={styles.externalLink}>
                    <DiscountSectionIcon
                      icon={getExternalReferenceIcon(
                        reference.externalSystem,
                        reference.syncStatus,
                      )}
                      shape="square"
                      size={32}
                      tone={
                        reference.syncStatus ===
                        DiscountExternalSyncStatus.Failed
                          ? "warning"
                          : reference.syncStatus ===
                              DiscountExternalSyncStatus.Disabled
                            ? "neutral"
                            : "primary"
                      }
                    />
                    <Flex vertical gap={4} className={styles.externalLink}>
                      <Flex align="center" gap={6} wrap>
                        <Typography.Text strong>
                          {reference.externalSystem}
                        </Typography.Text>
                        <Tag color={STATUS_COLORS[reference.syncStatus]}>
                          {formatDiscountEnum(reference.syncStatus)}
                        </Tag>
                        <Tag>{formatDiscountEnum(reference.direction)}</Tag>
                      </Flex>
                      {reference.externalUrl ? (
                        <Typography.Link
                          href={reference.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          ellipsis
                        >
                          {reference.externalId} <LuArrowUpRight />
                        </Typography.Link>
                      ) : (
                        <CopyableChip
                          value={reference.externalId}
                          displayValue={reference.externalId}
                          mono
                        />
                      )}
                      <Typography.Text
                        type={reference.lastError ? "danger" : "secondary"}
                      >
                        {reference.lastError
                          ? reference.lastError
                          : reference.lastSyncedAt
                            ? `Last synced ${formatDiscountDateTime(reference.lastSyncedAt)}`
                            : `Updated ${formatDiscountDateTime(reference.updatedAt)}`}
                      </Typography.Text>
                    </Flex>
                  </Flex>
                </Flex>
              </div>
            ))}
          </div>
          {discount.externalReferences.totalCount > references.length && (
            <Typography.Text type="secondary">
              Showing {references.length} of{" "}
              {discount.externalReferences.totalCount} references
            </Typography.Text>
          )}
        </Flex>
      ) : (
        <EntityDetailsEmptyState
          icon={<LuPlug />}
          state={{
            title: "No external references",
            description:
              "Connect an external promotion or integration to track synchronization.",
          }}
        />
      )}
    </Paper>
  );
}
