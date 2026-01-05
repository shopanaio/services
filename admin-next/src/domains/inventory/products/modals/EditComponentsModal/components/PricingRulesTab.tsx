"use client";

import { useCallback, useMemo, useState } from "react";
import { createStyles } from "antd-style";
import {
  Typography,
  Table,
  Button,
  Input,
  InputNumber,
  Select,
  Popconfirm,
  Space,
  Tooltip,
  Tag,
  Empty,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import { Paper } from "../../../components/Paper";
import {
  ComponentPriceType,
  type IPricingRuleTemplate,
  type ITieredDiscount,
  type IComponentGroup,
  PRICE_RULE_OPTIONS,
} from "../types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  tableActions: {
    display: "flex",
    gap: 4,
  },
  editInput: {
    width: "100%",
  },
  priceTag: {
    fontFamily: "monospace",
  },
  emptyState: {
    padding: "24px 0",
  },
  groupTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
  },
}));

// ============================================================================
// Types
// ============================================================================

interface IPricingRulesTabProps {
  pricingTemplates: IPricingRuleTemplate[];
  onPricingTemplatesChange: (templates: IPricingRuleTemplate[]) => void;
  tieredDiscounts: ITieredDiscount[];
  onTieredDiscountsChange: (discounts: ITieredDiscount[]) => void;
  groups: IComponentGroup[];
}

interface IEditingTemplate extends IPricingRuleTemplate {
  isNew?: boolean;
}

interface IEditingDiscount extends ITieredDiscount {
  isNew?: boolean;
}

// ============================================================================
// Price Type Options for Select
// ============================================================================

const PRICE_TYPE_SELECT_OPTIONS = PRICE_RULE_OPTIONS.map((opt) => ({
  value: opt.value,
  label: opt.label,
}));

// ============================================================================
// Component
// ============================================================================

export const PricingRulesTab = ({
  pricingTemplates,
  onPricingTemplatesChange,
  tieredDiscounts,
  onTieredDiscountsChange,
  groups,
}: IPricingRulesTabProps) => {
  const { styles } = useStyles();

  // ========================================
  // Pricing Templates State
  // ========================================
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<IEditingTemplate | null>(null);

  const handleAddTemplate = useCallback(() => {
    const newTemplate: IEditingTemplate = {
      id: `tpl-${Date.now()}`,
      name: "",
      priceType: ComponentPriceType.DISCOUNT_PERCENT,
      priceValue: 10,
      applyToGroupIds: "all",
      isNew: true,
    };
    setEditingTemplateId(newTemplate.id);
    setEditingTemplate(newTemplate);
  }, []);

  const handleEditTemplate = useCallback((template: IPricingRuleTemplate) => {
    setEditingTemplateId(template.id);
    setEditingTemplate({ ...template });
  }, []);

  const handleSaveTemplate = useCallback(() => {
    if (!editingTemplate || !editingTemplate.name.trim()) return;

    const { isNew, ...templateData } = editingTemplate;

    if (isNew) {
      onPricingTemplatesChange([...pricingTemplates, templateData]);
    } else {
      onPricingTemplatesChange(
        pricingTemplates.map((t) => (t.id === templateData.id ? templateData : t))
      );
    }

    setEditingTemplateId(null);
    setEditingTemplate(null);
  }, [editingTemplate, pricingTemplates, onPricingTemplatesChange]);

  const handleCancelTemplateEdit = useCallback(() => {
    setEditingTemplateId(null);
    setEditingTemplate(null);
  }, []);

  const handleDeleteTemplate = useCallback(
    (id: string) => {
      onPricingTemplatesChange(pricingTemplates.filter((t) => t.id !== id));
    },
    [pricingTemplates, onPricingTemplatesChange]
  );

  // ========================================
  // Tiered Discounts State
  // ========================================
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<IEditingDiscount | null>(null);

  const handleAddDiscount = useCallback(() => {
    const maxMinItems = Math.max(0, ...tieredDiscounts.map((d) => d.minItems));
    const newDiscount: IEditingDiscount = {
      id: `tier-${Date.now()}`,
      minItems: maxMinItems + 2,
      discountPercent: 5,
      isNew: true,
    };
    setEditingDiscountId(newDiscount.id);
    setEditingDiscount(newDiscount);
  }, [tieredDiscounts]);

  const handleEditDiscount = useCallback((discount: ITieredDiscount) => {
    setEditingDiscountId(discount.id);
    setEditingDiscount({ ...discount });
  }, []);

  const handleSaveDiscount = useCallback(() => {
    if (!editingDiscount) return;

    const { isNew, ...discountData } = editingDiscount;

    if (isNew) {
      const newDiscounts = [...tieredDiscounts, discountData].sort(
        (a, b) => a.minItems - b.minItems
      );
      onTieredDiscountsChange(newDiscounts);
    } else {
      const updatedDiscounts = tieredDiscounts
        .map((d) => (d.id === discountData.id ? discountData : d))
        .sort((a, b) => a.minItems - b.minItems);
      onTieredDiscountsChange(updatedDiscounts);
    }

    setEditingDiscountId(null);
    setEditingDiscount(null);
  }, [editingDiscount, tieredDiscounts, onTieredDiscountsChange]);

  const handleCancelDiscountEdit = useCallback(() => {
    setEditingDiscountId(null);
    setEditingDiscount(null);
  }, []);

  const handleDeleteDiscount = useCallback(
    (id: string) => {
      onTieredDiscountsChange(tieredDiscounts.filter((d) => d.id !== id));
    },
    [tieredDiscounts, onTieredDiscountsChange]
  );

  // ========================================
  // Templates Table Columns
  // ========================================
  const templateColumns: ColumnsType<IPricingRuleTemplate> = useMemo(
    () => [
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
        width: 180,
        render: (_, record) => {
          if (editingTemplateId === record.id && editingTemplate) {
            return (
              <Input
                value={editingTemplate.name}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, name: e.target.value })
                }
                placeholder="Template name"
                className={styles.editInput}
                autoFocus
              />
            );
          }
          return <Typography.Text strong>{record.name}</Typography.Text>;
        },
      },
      {
        title: "Price Rule",
        dataIndex: "priceType",
        key: "priceType",
        width: 160,
        render: (_, record) => {
          if (editingTemplateId === record.id && editingTemplate) {
            return (
              <Select
                value={editingTemplate.priceType}
                onChange={(value) =>
                  setEditingTemplate({
                    ...editingTemplate,
                    priceType: value,
                    priceValue:
                      value === ComponentPriceType.FREE ||
                      value === ComponentPriceType.INCLUDED ||
                      value === ComponentPriceType.BASE
                        ? null
                        : editingTemplate.priceValue ?? 10,
                  })
                }
                options={PRICE_TYPE_SELECT_OPTIONS}
                style={{ width: "100%" }}
              />
            );
          }
          const option = PRICE_RULE_OPTIONS.find((o) => o.value === record.priceType);
          return option?.label ?? record.priceType;
        },
      },
      {
        title: "Value",
        dataIndex: "priceValue",
        key: "priceValue",
        width: 100,
        render: (_, record) => {
          const option = PRICE_RULE_OPTIONS.find((o) => o.value === record.priceType);
          const requiresValue = option?.requiresValue;

          if (editingTemplateId === record.id && editingTemplate) {
            if (!requiresValue) {
              return <Typography.Text type="secondary">—</Typography.Text>;
            }
            return (
              <InputNumber
                value={editingTemplate.priceValue ?? undefined}
                onChange={(value) =>
                  setEditingTemplate({ ...editingTemplate, priceValue: value })
                }
                min={0}
                addonAfter={option?.valueSuffix}
                style={{ width: "100%" }}
              />
            );
          }

          if (!requiresValue || record.priceValue === null) {
            return <Typography.Text type="secondary">—</Typography.Text>;
          }

          return (
            <Tag className={styles.priceTag}>
              {record.priceValue}
              {option?.valueSuffix}
            </Tag>
          );
        },
      },
      {
        title: "Apply To",
        dataIndex: "applyToGroupIds",
        key: "applyToGroupIds",
        render: (_, record) => {
          if (editingTemplateId === record.id && editingTemplate) {
            return (
              <Select
                mode="multiple"
                value={
                  editingTemplate.applyToGroupIds === "all"
                    ? []
                    : editingTemplate.applyToGroupIds
                }
                onChange={(value) =>
                  setEditingTemplate({
                    ...editingTemplate,
                    applyToGroupIds: value.length === 0 ? "all" : value,
                  })
                }
                placeholder="All groups"
                style={{ width: "100%" }}
                options={groups.map((g) => ({ value: g.id, label: g.title }))}
                allowClear
              />
            );
          }

          if (record.applyToGroupIds === "all") {
            return <Tag color="blue">All Groups</Tag>;
          }

          return (
            <div className={styles.groupTags}>
              {record.applyToGroupIds.map((groupId) => {
                const group = groups.find((g) => g.id === groupId);
                return (
                  <Tag key={groupId} color="default">
                    {group?.title ?? groupId}
                  </Tag>
                );
              })}
            </div>
          );
        },
      },
      {
        title: "",
        key: "actions",
        width: 80,
        render: (_, record) => {
          if (editingTemplateId === record.id) {
            return (
              <Space className={styles.tableActions}>
                <Button
                  type="text"
                  size="small"
                  icon={<SaveOutlined />}
                  onClick={handleSaveTemplate}
                  disabled={!editingTemplate?.name.trim()}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={handleCancelTemplateEdit}
                />
              </Space>
            );
          }
          return (
            <Space className={styles.tableActions}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditTemplate(record)}
              />
              <Popconfirm
                title="Delete template?"
                description="This action cannot be undone."
                onConfirm={() => handleDeleteTemplate(record.id)}
                okText="Delete"
                cancelText="Cancel"
              >
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [
      editingTemplateId,
      editingTemplate,
      groups,
      styles,
      handleSaveTemplate,
      handleCancelTemplateEdit,
      handleEditTemplate,
      handleDeleteTemplate,
    ]
  );

  // ========================================
  // Tiered Discounts Table Columns
  // ========================================
  const discountColumns: ColumnsType<ITieredDiscount> = useMemo(
    () => [
      {
        title: "Min Items",
        dataIndex: "minItems",
        key: "minItems",
        width: 150,
        render: (_, record) => {
          if (editingDiscountId === record.id && editingDiscount) {
            return (
              <InputNumber
                value={editingDiscount.minItems}
                onChange={(value) =>
                  setEditingDiscount({ ...editingDiscount, minItems: value ?? 2 })
                }
                min={2}
                style={{ width: "100%" }}
                autoFocus
              />
            );
          }
          return (
            <Typography.Text>
              {record.minItems}+ items
            </Typography.Text>
          );
        },
      },
      {
        title: "Discount",
        dataIndex: "discountPercent",
        key: "discountPercent",
        width: 150,
        render: (_, record) => {
          if (editingDiscountId === record.id && editingDiscount) {
            return (
              <InputNumber
                value={editingDiscount.discountPercent}
                onChange={(value) =>
                  setEditingDiscount({
                    ...editingDiscount,
                    discountPercent: value ?? 5,
                  })
                }
                min={1}
                max={100}
                addonAfter="%"
                style={{ width: "100%" }}
              />
            );
          }
          return (
            <Tag color="green" className={styles.priceTag}>
              -{record.discountPercent}%
            </Tag>
          );
        },
      },
      {
        title: "Description",
        key: "description",
        render: (_, record) => {
          return (
            <Typography.Text type="secondary">
              When customer selects {record.minItems} or more components, apply{" "}
              {record.discountPercent}% discount on total components price
            </Typography.Text>
          );
        },
      },
      {
        title: "",
        key: "actions",
        width: 80,
        render: (_, record) => {
          if (editingDiscountId === record.id) {
            return (
              <Space className={styles.tableActions}>
                <Button
                  type="text"
                  size="small"
                  icon={<SaveOutlined />}
                  onClick={handleSaveDiscount}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={handleCancelDiscountEdit}
                />
              </Space>
            );
          }
          return (
            <Space className={styles.tableActions}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditDiscount(record)}
              />
              <Popconfirm
                title="Delete tier?"
                description="This action cannot be undone."
                onConfirm={() => handleDeleteDiscount(record.id)}
                okText="Delete"
                cancelText="Cancel"
              >
                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [
      editingDiscountId,
      editingDiscount,
      styles,
      handleSaveDiscount,
      handleCancelDiscountEdit,
      handleEditDiscount,
      handleDeleteDiscount,
    ]
  );

  // ========================================
  // Template data with editing row
  // ========================================
  const templateDataSource = useMemo(() => {
    if (editingTemplate?.isNew) {
      return [...pricingTemplates, editingTemplate];
    }
    return pricingTemplates;
  }, [pricingTemplates, editingTemplate]);

  // ========================================
  // Discount data with editing row
  // ========================================
  const discountDataSource = useMemo(() => {
    if (editingDiscount?.isNew) {
      return [...tieredDiscounts, editingDiscount].sort(
        (a, b) => a.minItems - b.minItems
      );
    }
    return tieredDiscounts;
  }, [tieredDiscounts, editingDiscount]);

  return (
    <div className={styles.container}>
      {/* Pricing Rule Templates */}
      <Paper>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <Typography.Text strong>Pricing Rule Templates</Typography.Text>
              <Tooltip title="Create reusable pricing rules that can be applied to components">
                <InfoCircleOutlined style={{ color: "var(--ant-color-text-secondary)" }} />
              </Tooltip>
            </div>
            <Button
              icon={<PlusOutlined />}
              onClick={handleAddTemplate}
              disabled={editingTemplateId !== null}
              size="small"
            >
              Add Template
            </Button>
          </div>

          {templateDataSource.length > 0 ? (
            <Table
              dataSource={templateDataSource}
              columns={templateColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          ) : (
            <Empty
              className={styles.emptyState}
              description="No pricing templates configured"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      </Paper>

      {/* Tiered Discounts */}
      <Paper>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <Typography.Text strong>Tiered Discounts</Typography.Text>
              <Tooltip title="Automatic discounts based on the number of selected components">
                <InfoCircleOutlined style={{ color: "var(--ant-color-text-secondary)" }} />
              </Tooltip>
            </div>
            <Button
              icon={<PlusOutlined />}
              onClick={handleAddDiscount}
              disabled={editingDiscountId !== null}
              size="small"
            >
              Add Tier
            </Button>
          </div>

          {discountDataSource.length > 0 ? (
            <Table
              dataSource={discountDataSource}
              columns={discountColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          ) : (
            <Empty
              className={styles.emptyState}
              description="No tiered discounts configured"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      </Paper>
    </div>
  );
};

export default PricingRulesTab;
