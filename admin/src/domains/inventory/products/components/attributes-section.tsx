import { useMemo, ReactNode } from "react";
import { createStyles } from "antd-style";
import { Descriptions, Flex, Typography } from "antd";
import { TagsOutlined } from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { EntityDetailsEmptyState } from "@/domains/inventory/components/entity-details-sections";
import type { ApiProductFeature, ApiProductFeatureValue } from "@/graphql/types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  descriptions: {
    "& .ant-descriptions-item": {
      paddingBottom: "4px !important",
    },
    "& .ant-descriptions-item-label": {
      color: token.colorTextSecondary,
      fontSize: 12,
      width: 300,
      flexShrink: 0,
    },
    "& .ant-descriptions-item-content": {
      fontSize: 13,
    },
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: token.colorTextSecondary,
    marginBottom: 4,
  },
}));

// ============================================================================
// Types
// ============================================================================

interface IAttributesSectionProps {
  features: ApiProductFeature[];
  actions?: ReactNode;
}

// ============================================================================
// Sub-components
// ============================================================================

interface IAttributeListProps {
  attributes: ApiProductFeature[];
  className?: string;
}

function compareIndex(left: number[], right: number[]): number {
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i += 1) {
    const leftValue = left[i] ?? -1;
    const rightValue = right[i] ?? -1;

    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }

  return left.length - right.length;
}

function sortValues(
  values: ApiProductFeatureValue[],
): ApiProductFeatureValue[] {
  return [...values].sort((left, right) => left.index - right.index);
}

const AttributeList = ({ attributes, className }: IAttributeListProps) => {
  if (attributes.length === 0) return null;

  return (
    <Descriptions
      size="small"
      column={1}
      bordered
      colon={false}
      className={className}
    >
      {attributes.map((attr) => (
        <Descriptions.Item key={attr.id} label={attr.name}>
          {sortValues(attr.values)
            .map((value) => value.name)
            .join(", ") || "--"}
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
};

interface IAttributeGroupBlockProps {
  group: ApiProductFeature;
  attributes: ApiProductFeature[];
  className?: string;
  titleClassName?: string;
}

const AttributeGroupBlock = ({
  group,
  attributes,
  className,
  titleClassName,
}: IAttributeGroupBlockProps) => {
  if (attributes.length === 0) return null;

  return (
    <div>
      <Typography.Text className={titleClassName}>{group.name}</Typography.Text>
      <AttributeList attributes={attributes} className={className} />
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const AttributesSection = ({
  features,
  actions,
}: IAttributesSectionProps) => {
  const { styles } = useStyles();

  const { rootAttributes, groups, attributesByGroupId } = useMemo(() => {
    const sortedFeatures = [...features].sort((left, right) =>
      compareIndex(left.index, right.index),
    );
    const rootAttrs = sortedFeatures.filter(
      (feature) => !feature.isGroup && feature.index.length === 1,
    );
    const groupRows = sortedFeatures.filter(
      (feature) => feature.isGroup && feature.index.length === 1,
    );
    const groupedAttributes = new Map<string, ApiProductFeature[]>();

    groupRows.forEach((group) => {
      groupedAttributes.set(
        group.id,
        sortedFeatures.filter(
          (feature) =>
            !feature.isGroup &&
            feature.index.length === 2 &&
            feature.index[0] === group.index[0],
        ),
      );
    });

    return {
      rootAttributes: rootAttrs,
      groups: groupRows,
      attributesByGroupId: groupedAttributes,
    };
  }, [features]);

  const hasContent =
    rootAttributes.length > 0 ||
    groups.some(
      (group) => (attributesByGroupId.get(group.id)?.length ?? 0) > 0,
    );

  if (!hasContent && !actions) {
    return null;
  }

  return (
    <Paper data-testid="product-attributes-section">
      <PaperHeader title="Attributes" actions={actions} />
      <Flex vertical gap={16}>
        {hasContent ? (
          <>
            <AttributeList
              attributes={rootAttributes}
              className={styles.descriptions}
            />

            {groups.map((group) => (
              <AttributeGroupBlock
                key={group.id}
                group={group}
                attributes={attributesByGroupId.get(group.id) ?? []}
                className={styles.descriptions}
                titleClassName={styles.groupTitle}
              />
            ))}
          </>
        ) : (
          <div data-testid="product-attributes-empty-state">
            <EntityDetailsEmptyState
              icon={<TagsOutlined />}
              state={{
                title: "No attributes added",
                description:
                  "Add product attributes to describe specifications, materials, and other structured details.",
              }}
            />
          </div>
        )}
      </Flex>
    </Paper>
  );
};
