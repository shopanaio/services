import { useMemo } from "react";
import { createStyles } from "antd-style";
import { Descriptions, Flex, Typography } from "antd";
import { Paper } from "./Paper";
import { PaperHeader } from "./PaperHeader";
import { EditAction } from "./EditAction";
import type { IAttributeRow } from "../modals/EditAttributesModal/types";

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
  data: IAttributeRow[];
  onEdit?: () => void;
}

interface IAttributeGroup {
  id: string;
  name: string;
  attributes: IAttributeRow[];
}

// ============================================================================
// Sub-components
// ============================================================================

interface IAttributeListProps {
  attributes: IAttributeRow[];
  className?: string;
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
          {attr.values?.map((v) => v.name).join(", ") || "—"}
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
};

interface IAttributeGroupBlockProps {
  group: IAttributeGroup;
  className?: string;
  titleClassName?: string;
}

const AttributeGroupBlock = ({
  group,
  className,
  titleClassName,
}: IAttributeGroupBlockProps) => {
  if (group.attributes.length === 0) return null;

  return (
    <div>
      <Typography.Text className={titleClassName}>{group.name}</Typography.Text>
      <AttributeList attributes={group.attributes} className={className} />
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const AttributesSection = ({ data, onEdit }: IAttributesSectionProps) => {
  const { styles } = useStyles();

  const { rootAttributes, groups } = useMemo(() => {
    const rootAttrs = data
      .filter((r) => r.type === "attribute" && r.parentId === null)
      .sort((a, b) => a.sortIndex - b.sortIndex);

    const groupRows = data
      .filter((r) => r.type === "group")
      .sort((a, b) => a.sortIndex - b.sortIndex);

    const groupsWithAttrs: IAttributeGroup[] = groupRows.map((group) => ({
      id: group.id,
      name: group.name,
      attributes: data
        .filter((r) => r.type === "attribute" && r.parentId === group.id)
        .sort((a, b) => a.sortIndex - b.sortIndex),
    }));

    return {
      rootAttributes: rootAttrs,
      groups: groupsWithAttrs,
    };
  }, [data]);

  const hasContent = rootAttributes.length > 0 || groups.some((g) => g.attributes.length > 0);

  if (!hasContent) {
    return null;
  }

  return (
    <Paper>
      <PaperHeader
        title="Attributes"
        actions={onEdit && <EditAction onEdit={onEdit} label="Edit attributes" />}
      />
      <Flex vertical gap={16}>
        {/* Root-level attributes (no group) */}
        <AttributeList
          attributes={rootAttributes}
          className={styles.descriptions}
        />

        {/* Grouped attributes */}
        {groups.map((group) => (
          <AttributeGroupBlock
            key={group.id}
            group={group}
            className={styles.descriptions}
            titleClassName={styles.groupTitle}
          />
        ))}
      </Flex>
    </Paper>
  );
};
