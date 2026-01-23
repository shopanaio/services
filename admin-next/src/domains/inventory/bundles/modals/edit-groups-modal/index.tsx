"use client";

import { useState, useCallback } from "react";
import { createStyles } from "antd-style";
import { Typography, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { useComponentVariantSettingsModal } from "@/domains/inventory/products/modals";
import { GroupCard } from "@/domains/inventory/products/modals/edit-components-modal/components";
import type {
  IComponentGroup,
  ComponentItem,
  PricingRuleTemplate,
} from "@/domains/inventory/products/modals/edit-components-modal/types";
import { ComponentItemType } from "@/domains/inventory/products/modals/edit-components-modal/types";

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
// Payload
// ============================================================================

export interface IEditGroupsModalPayload {
  groups: IComponentGroup[];
  pricingTemplates: PricingRuleTemplate[];
  onSave?: (groups: IComponentGroup[]) => void;
}

// ============================================================================
// Component
// ============================================================================

export const EditGroupsModal = () => {
  const { styles } = useStyles();
  const { pop, setDirty, payload } = useModalStackContext();
  const { push: openVariantSettingsModal } = useComponentVariantSettingsModal();

  const modalPayload = payload as unknown as IEditGroupsModalPayload | undefined;

  const [groups, setGroups] = useState<IComponentGroup[]>(
    modalPayload?.groups ?? []
  );
  const pricingTemplates = modalPayload?.pricingTemplates ?? [];

  const [expandedIds, setExpandedIds] = useState<string[]>(
    groups[0]?.id ? [groups[0].id] : []
  );
  const [expandedProducts, setExpandedProducts] = useState<
    Map<string, ComponentItem>
  >(new Map());

  // ========================================
  // Group CRUD
  // ========================================

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
    setGroups((prev) => [...prev, newGroup]);
    setExpandedIds((prev) => [...prev, newGroup.id]);
    setDirty(true);
  }, [groups.length, setDirty]);

  const handleGroupChange = useCallback(
    (updatedGroup: IComponentGroup) => {
      setGroups((prev) =>
        prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g))
      );
      setDirty(true);
    },
    [setDirty]
  );

  const handleDeleteGroup = useCallback(
    (groupId: string) => {
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      setDirty(true);
    },
    [setDirty]
  );

  const handleDuplicateGroup = useCallback(
    (groupId: string) => {
      setGroups((prev) => {
        const groupToDuplicate = prev.find((g) => g.id === groupId);
        if (!groupToDuplicate) return prev;

        const newGroup: IComponentGroup = {
          ...groupToDuplicate,
          id: `grp-${Date.now()}`,
          title: `${groupToDuplicate.title} (copy)`,
          sortIndex: prev.length,
          items: groupToDuplicate.items.map((item) => ({
            ...item,
            id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          })),
        };
        setExpandedIds((ids) => [...ids, newGroup.id]);
        return [...prev, newGroup];
      });
      setDirty(true);
    },
    [setDirty]
  );

  // ========================================
  // Variant Handlers
  // ========================================

  const handleEditVariants = useCallback(
    (item: ComponentItem, groupId: string) => {
      if (item.itemType !== ComponentItemType.PRODUCT || !item.assignedProduct) return;

      const assignedProduct = item.assignedProduct;
      const variantsFromConnection =
        assignedProduct.variants?.edges?.map((e) => e.node) ?? [];

      const priceType = "id" in item.pricingRule ? "BASE" : item.pricingRule.priceType;
      const priceValue = "id" in item.pricingRule ? null : item.pricingRule.priceValue;

      openVariantSettingsModal({
        itemId: item.id,
        productId: assignedProduct.id,
        productTitle: item.title ?? assignedProduct.title,
        availableVariantIds: item.excludeAssignedProductVariants ?? null,
        priceType: priceType as any,
        priceValue,
        variants: variantsFromConnection.map((v) => ({
          id: v.id,
          title: v.title ?? v.sku ?? v.id,
          sku: v.sku ?? "",
          price:
            typeof v.price?.amountMinor === "bigint"
              ? Number(v.price.amountMinor)
              : typeof v.price?.amountMinor === "number"
              ? v.price.amountMinor
              : 0,
          stock: v.stock?.[0]?.quantityOnHand ?? 0,
          options: v.selectedOptions?.map((o) => ({
            optionId: o.optionId,
            value: o.optionValueId,
          })),
        })),
        options: assignedProduct.options?.map((o) => ({
          id: o.id,
          name: o.name,
          values: o.values?.map((v) => v.name) ?? [],
        })),
        showAsVariants: false,
        onSave: (data: { availableVariantIds: string[] | null; showAsVariants: boolean }) => {
          setGroups((prev) =>
            prev.map((g) =>
              g.id === groupId
                ? {
                    ...g,
                    items: g.items.map((i) =>
                      i.id === item.id
                        ? { ...i, excludeAssignedProductVariants: data.availableVariantIds }
                        : i
                    ),
                  }
                : g
            )
          );
          setDirty(true);
        },
      });
    },
    [openVariantSettingsModal, setDirty]
  );

  const handleIncludeVariants = useCallback(
    (item: ComponentItem, groupId: string) => {
      if (item.itemType !== ComponentItemType.PRODUCT || !item.assignedProduct) return;

      const assignedProduct = item.assignedProduct;
      const variantsFromConnection =
        assignedProduct.variants?.edges?.map((e) => e.node) ?? [];
      if (variantsFromConnection.length === 0) return;

      setExpandedProducts((prev) => new Map(prev).set(assignedProduct.id, item));

      const variantItems: ComponentItem[] = variantsFromConnection.map(
        (variant, index) => ({
          id: `item-${Date.now()}-${index}`,
          itemType: ComponentItemType.VARIANT,
          assignedVariant: variant,
          sortIndex: item.sortIndex + index + 1,
          pricingRule: item.pricingRule,
          title: item.title,
          featuredImage: item.featuredImage,
        })
      );

      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;
          const itemIndex = g.items.findIndex((i) => i.id === item.id);
          const newItems = [...g.items];
          newItems.splice(itemIndex, 1, ...variantItems);
          return { ...g, items: newItems.map((i, idx) => ({ ...i, sortIndex: idx })) };
        })
      );
      setDirty(true);
    },
    [setDirty]
  );

  const handleShowAsProduct = useCallback(
    (item: ComponentItem, groupId: string) => {
      if (item.itemType !== ComponentItemType.VARIANT || !item.assignedVariant) return;

      const productId = item.assignedVariant.product?.id;
      if (!productId) return;

      const storedProduct = expandedProducts.get(productId);
      if (!storedProduct) return;

      setExpandedProducts((prev) => {
        const newMap = new Map(prev);
        newMap.delete(productId);
        return newMap;
      });

      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;
          const firstVariantIndex = g.items.findIndex(
            (i) =>
              i.itemType === ComponentItemType.VARIANT &&
              i.assignedVariant?.product?.id === productId
          );
          if (firstVariantIndex === -1) return g;

          const newItems = g.items.filter(
            (i) =>
              !(
                i.itemType === ComponentItemType.VARIANT &&
                i.assignedVariant?.product?.id === productId
              )
          );
          newItems.splice(firstVariantIndex, 0, { ...storedProduct, sortIndex: firstVariantIndex });
          return { ...g, items: newItems.map((i, idx) => ({ ...i, sortIndex: idx })) };
        })
      );
      setDirty(true);
    },
    [expandedProducts, setDirty]
  );

  // ========================================
  // Save
  // ========================================

  const handleSave = useCallback(() => {
    modalPayload?.onSave?.(groups);
    pop();
  }, [groups, modalPayload, pop]);

  return (
    <ModalLayout
      name="edit-bundle-groups"
      header={
        <ModalHeader
          name="edit-bundle-groups"
          title="Edit Component Groups"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            onClick: handleSave,
          }}
        />
      }
    >
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
            onEditVariants={(item) => handleEditVariants(item, group.id)}
            onIncludeVariants={(item) => handleIncludeVariants(item, group.id)}
            onShowAsProduct={(item) => handleShowAsProduct(item, group.id)}
            pricingTemplates={pricingTemplates}
          />
        ))}
      </div>
    </ModalLayout>
  );
};

export default EditGroupsModal;
