"use client";

import { useState, useCallback } from "react";
import { createStyles } from "antd-style";
import { Typography, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";

import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  GroupCard,
} from "@/domains/inventory/products/modals/edit-components-modal/components";
import type {
  IComponentGroup,
  ComponentItem,
  PricingRuleTemplate,
} from "@/domains/inventory/products/modals/edit-components-modal/types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(() => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  groupsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
}));

// ============================================================================
// Props
// ============================================================================

interface IGroupsSectionProps {
  groups: IComponentGroup[];
  onGroupsChange: (groups: IComponentGroup[]) => void;
  onEditVariants?: (item: ComponentItem, groupId: string) => void;
  onIncludeVariants?: (item: ComponentItem, groupId: string) => void;
  onShowAsProduct?: (item: ComponentItem, groupId: string) => void;
  pricingTemplates: PricingRuleTemplate[];
}

// ============================================================================
// Component
// ============================================================================

export const GroupsSection = ({
  groups,
  onGroupsChange,
  onEditVariants,
  onIncludeVariants,
  onShowAsProduct,
  pricingTemplates,
}: IGroupsSectionProps) => {
  const { styles } = useStyles();
  const [expandedIds, setExpandedIds] = useState<string[]>(
    groups[0]?.id ? [groups[0].id] : []
  );

  const handleToggle = useCallback((groupId: string) => {
    setExpandedIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  }, []);

  const handleAddGroup = useCallback(() => {
    const newGroup: IComponentGroup = {
      id: `grp-${Date.now()}`,
      title: "New Group",
      sortIndex: groups.length,
      isRequired: false,
      isMultiple: false,
      minSelection: null,
      maxSelection: null,
      items: [],
    };
    onGroupsChange([...groups, newGroup]);
    setExpandedIds((prev) => [...prev, newGroup.id]);
  }, [groups, onGroupsChange]);

  const handleGroupChange = useCallback(
    (updatedGroup: IComponentGroup) => {
      onGroupsChange(
        groups.map((g) => (g.id === updatedGroup.id ? updatedGroup : g))
      );
    },
    [groups, onGroupsChange]
  );

  const handleDeleteGroup = useCallback(
    (groupId: string) => {
      onGroupsChange(groups.filter((g) => g.id !== groupId));
    },
    [groups, onGroupsChange]
  );

  const handleDuplicateGroup = useCallback(
    (groupId: string) => {
      const groupToDuplicate = groups.find((g) => g.id === groupId);
      if (!groupToDuplicate) return;

      const newGroup: IComponentGroup = {
        ...groupToDuplicate,
        id: `grp-${Date.now()}`,
        title: `${groupToDuplicate.title} (copy)`,
        sortIndex: groups.length,
        items: groupToDuplicate.items.map((item) => ({
          ...item,
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        })),
      };
      onGroupsChange([...groups, newGroup]);
      setExpandedIds((prev) => [...prev, newGroup.id]);
    },
    [groups, onGroupsChange]
  );

  return (
    <Paper>
      <PaperHeader title="Component Groups" />
      <div className={styles.container}>
        <div className={styles.groupsHeader}>
          <Typography.Text strong>COMPONENT GROUPS</Typography.Text>
          <Button size="small" icon={<PlusOutlined />} onClick={handleAddGroup}>
            Add
          </Button>
        </div>

        {groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            isExpanded={expandedIds.includes(group.id)}
            onToggle={() => handleToggle(group.id)}
            onChange={handleGroupChange}
            onDelete={() => handleDeleteGroup(group.id)}
            onDuplicate={() => handleDuplicateGroup(group.id)}
            onEditVariants={
              onEditVariants
                ? (item) => onEditVariants(item, group.id)
                : undefined
            }
            onIncludeVariants={
              onIncludeVariants
                ? (item) => onIncludeVariants(item, group.id)
                : undefined
            }
            onShowAsProduct={
              onShowAsProduct
                ? (item) => onShowAsProduct(item, group.id)
                : undefined
            }
            pricingTemplates={pricingTemplates}
          />
        ))}
      </div>
    </Paper>
  );
};
