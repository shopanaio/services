"use client";

import type { ReactNode } from "react";
import {
  Button,
  Dropdown,
  Flex,
  Tag,
  Timeline,
  Typography,
} from "antd";
import {
  LuBox,
  LuEllipsis,
  LuGift,
  LuPencil,
  LuShoppingCart,
  LuTruck,
  LuTriangleAlert,
} from "react-icons/lu";
import type {
  ApiDiscount,
  ApiDiscountTarget,
  ApiDiscountTargetSelection,
} from "@/graphql/types";
import {
  DiscountKind,
  DiscountReferenceStatus,
  DiscountTargetRole,
  DiscountTargetType,
} from "@/graphql/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import { DiscountSectionIcon } from "../discount-section-icon";
import { useDiscountSectionStyles } from "../discount-details-card.styles";
import { formatDiscountEnum } from "../formatters";

interface AppliesToSectionProps {
  discount: ApiDiscount;
  onEdit?: () => void;
}

function getTargetTitle(target: ApiDiscountTarget): string {
  const entity = target.target;
  if (!entity) return "Unresolved catalog reference";
  if (entity.__typename === "Product") return entity.title;
  if (entity.__typename === "Variant") return entity.handle;
  if (entity.__typename === "Category") return entity.name;
  return target.targetId;
}

function getTargetDescription(target: ApiDiscountTarget): string {
  const entity = target.target;
  if (!entity) return "The referenced catalog entity is no longer available.";
  if (entity.__typename === "Product") return "Product";
  if (entity.__typename === "Variant") {
    const sku = entity.inventoryItem?.sku;
    return ["Variant", sku ? `SKU ${sku}` : null].filter(Boolean).join(" · ");
  }
  if (entity.__typename === "Category") return "Category";
  return formatDiscountEnum(target.targetType);
}

function SelectionContent({
  selection,
}: {
  selection: ApiDiscountTargetSelection;
}) {
  const { styles } = useDiscountSectionStyles();
  const staleCount = selection.targets.filter(
    (target) => target.referenceStatus === DiscountReferenceStatus.Stale,
  ).length;
  const visibleTargets = selection.targets.slice(0, 3);

  if (selection.targetType === DiscountTargetType.AllProducts) {
    return (
      <div className={styles.entityRow}>
        <Flex align="center" gap={10}>
          <DiscountSectionIcon
            icon={<LuBox />}
            shape="square"
            size={32}
          />
          <Flex vertical>
            <Typography.Text strong>All products</Typography.Text>
            <Typography.Text type="secondary">
              The complete product catalog is eligible.
            </Typography.Text>
          </Flex>
        </Flex>
      </div>
    );
  }

  return (
    <Flex vertical gap={8}>
      {staleCount > 0 && (
        <Flex align="flex-start" gap={8} className={styles.warningBox}>
          <LuTriangleAlert />
          <Typography.Text>
            {staleCount} catalog reference{staleCount === 1 ? "" : "s"} need
            attention.
          </Typography.Text>
        </Flex>
      )}
      <Flex align="center" justify="space-between" gap={8}>
        <Typography.Text strong>
          Selected {formatDiscountEnum(selection.targetType).toLowerCase()}
        </Typography.Text>
        <Typography.Text type="secondary">
          {selection.targets.length}{" "}
          {formatDiscountEnum(selection.targetType).toLowerCase()}
        </Typography.Text>
      </Flex>
      <div className={styles.targetGrid}>
        {visibleTargets.map((target, index) => (
          <div className={styles.entityRow} key={target.targetId}>
            <Flex align="center" gap={12}>
              <Flex align="center" gap={10} className={styles.entityTitle}>
                <DiscountSectionIcon
                  icon={
                    target.referenceStatus === DiscountReferenceStatus.Stale ? (
                      <LuTriangleAlert />
                    ) : (
                      <LuBox />
                    )
                  }
                  shape="square"
                  size={32}
                  tone={
                    target.referenceStatus === DiscountReferenceStatus.Stale
                      ? "warning"
                      : index === 0
                        ? "primary"
                        : "neutral"
                  }
                />
                <Flex vertical className={styles.entityTitle}>
                  <Typography.Text strong ellipsis>
                    {getTargetTitle(target)}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    {getTargetDescription(target)}
                  </Typography.Text>
                </Flex>
              </Flex>
              {target.referenceStatus === DiscountReferenceStatus.Stale && (
                <Tag color="warning">Stale</Tag>
              )}
            </Flex>
          </div>
        ))}
      </div>
      {selection.targets.length > visibleTargets.length && (
        <Typography.Text type="secondary">
          +{selection.targets.length - visibleTargets.length} more selected
        </Typography.Text>
      )}
    </Flex>
  );
}

function BuyXFlow({
  discount,
  qualifier,
  benefit,
}: {
  discount: ApiDiscount;
  qualifier: ApiDiscountTargetSelection;
  benefit: ApiDiscountTargetSelection;
}) {
  const { styles } = useDiscountSectionStyles();
  const rule =
    discount.rule?.__typename === "DiscountBuyXGetYRule"
      ? discount.rule
      : null;
  const qualifierTitles = qualifier.targets
    .slice(0, 2)
    .map(getTargetTitle);
  const qualifierSummary = [
    qualifierTitles[0],
    qualifier.targets.length > 1
      ? `+${qualifier.targets.length - 1} more`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const benefitTarget = benefit.targets[0];

  return (
    <Timeline
      className={styles.buyXTimeline}
      items={[
        {
          dot: (
            <DiscountSectionIcon
              icon={<LuShoppingCart />}
              tone="neutral"
              size={24}
            />
          ),
          children: (
            <Flex vertical>
              <Typography.Text className={styles.eyebrow}>
                When · Customer buys
              </Typography.Text>
              <Typography.Text strong>
                {rule?.requiredQuantity ?? qualifier.targets.length} eligible
                items from selected{" "}
                {formatDiscountEnum(qualifier.targetType).toLowerCase()}
              </Typography.Text>
              <Typography.Text type="secondary">
                {qualifierSummary}
              </Typography.Text>
            </Flex>
          ),
        },
        {
          dot: (
            <DiscountSectionIcon
              icon={<LuGift />}
              tone="primaryBordered"
              size={24}
            />
          ),
          children: (
            <Flex vertical>
              <Typography.Text
                className={`${styles.eyebrow} ${styles.primaryEyebrow}`}
              >
                Then · Customer gets
              </Typography.Text>
              <Typography.Text strong>
                {benefitTarget
                  ? getTargetTitle(benefitTarget)
                  : "Selected benefit items"}
              </Typography.Text>
              <Typography.Text type="secondary">
                {rule?.benefitQuantity ?? benefit.targets.length} eligible item
                free
                {rule?.usesPerOrderLimit != null
                  ? ` · Up to ${rule.usesPerOrderLimit} times per order`
                  : ""}
              </Typography.Text>
            </Flex>
          ),
        },
      ]}
    />
  );
}

function ScopeHeader({
  label,
}: {
  label: string;
}) {
  const { styles } = useDiscountSectionStyles();

  return (
    <Flex
      align="center"
      justify="space-between"
      gap={8}
      className={styles.scopeHeader}
    >
      <Tag color="blue">{label}</Tag>
      <Typography.Text type="secondary">No catalog targets</Typography.Text>
    </Flex>
  );
}

function ScopeContent({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  const { styles } = useDiscountSectionStyles();

  return (
    <div className={styles.entityRow}>
      <Flex align="center" gap={10}>
        <DiscountSectionIcon icon={icon} size={36} />
        <Flex vertical>
          <Typography.Text strong>{title}</Typography.Text>
          <Typography.Text type="secondary">{description}</Typography.Text>
        </Flex>
      </Flex>
    </div>
  );
}

export function AppliesToSection({
  discount,
  onEdit,
}: AppliesToSectionProps) {
  const { styles } = useDiscountSectionStyles();
  const qualifier = discount.targetSelections.find(
    (selection) => selection.role === DiscountTargetRole.Qualifier,
  );
  const benefit = discount.targetSelections.find(
    (selection) => selection.role === DiscountTargetRole.Benefit,
  );
  const isConnectedFlow =
    discount.kind === DiscountKind.BuyXGetY && qualifier && benefit;
  const appliesToEntireOrder =
    discount.kind === DiscountKind.AmountOffOrder;
  const appliesToShipping = discount.kind === DiscountKind.FreeShipping;

  return (
    <Paper className={styles.section} data-testid="discount-applies-to-section">
      <PaperHeader
        title="Applies to"
        className={styles.compactHeader}
        actions={
          onEdit ? (
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "edit-value-targets",
                    label: "Edit value, targets & requirements",
                    icon: <LuPencil />,
                    "data-testid": "discount-targets-edit-menu-item",
                    onClick: onEdit,
                  },
                ],
              }}
            >
              <Button
                size="small"
                icon={<LuEllipsis />}
                aria-label="Discount target actions"
                data-testid="discount-targets-actions"
              />
            </Dropdown>
          ) : undefined
        }
      />

      {appliesToEntireOrder ? (
        <>
          <ScopeHeader label="ORDER" />
          <ScopeContent
            icon={<LuShoppingCart />}
            title="Applies to the entire order"
            description="Order discounts cannot contain catalog target selections."
          />
        </>
      ) : appliesToShipping ? (
        <>
          <ScopeHeader label="SHIPPING" />
          <ScopeContent
            icon={<LuTruck />}
            title="Applies to eligible shipping rates"
            description="Free-shipping discounts cannot contain catalog target selections."
          />
        </>
      ) : discount.targetSelections.length === 0 ? (
        <EntityDetailsEmptyState
          icon={<LuBox />}
          state={{
            title: "No products or collections selected",
            description:
              "Choose which catalog items are eligible for this discount.",
          }}
        />
      ) : isConnectedFlow ? (
        <BuyXFlow
          discount={discount}
          qualifier={qualifier}
          benefit={benefit}
        />
      ) : (
        discount.targetSelections.map((selection) => (
          <SelectionContent
            key={`${selection.role}-${selection.targetType}`}
            selection={selection}
          />
        ))
      )}
    </Paper>
  );
}
