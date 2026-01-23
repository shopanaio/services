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
  Empty,
  Tag,
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

import { Paper, PaperHeader } from "@/ui-kit/paper";
import {
  ComponentPriceType,
  type PricingRuleTemplate,
  PRICE_RULE_OPTIONS,
} from "@/domains/inventory/products/modals/edit-components-modal/types";

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(() => ({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
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
}));

// ============================================================================
// Types
// ============================================================================

interface ITemplatesTabProps {
  pricingTemplates: PricingRuleTemplate[];
  onPricingTemplatesChange: (templates: PricingRuleTemplate[]) => void;
}

interface IEditingTemplate extends PricingRuleTemplate {
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

export const TemplatesTab = ({
  pricingTemplates,
  onPricingTemplatesChange,
}: ITemplatesTabProps) => {
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
      isNew: true,
    };
    setEditingTemplateId(newTemplate.id);
    setEditingTemplate(newTemplate);
  }, []);

  const handleEditTemplate = useCallback((template: PricingRuleTemplate) => {
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
  // Templates Table Columns
  // ========================================
  const templateColumns: ColumnsType<PricingRuleTemplate> = useMemo(
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
                suffix={option?.valueSuffix}
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
      styles,
      handleSaveTemplate,
      handleCancelTemplateEdit,
      handleEditTemplate,
      handleDeleteTemplate,
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

  return (
    <Paper>
      <PaperHeader
        title="Pricing Rule Templates"
        extra={
          <Tooltip title="Create reusable pricing rules that can be applied to components">
            <InfoCircleOutlined style={{ color: "var(--ant-color-text-secondary)" }} />
          </Tooltip>
        }
        actions={
          <Button
            icon={<PlusOutlined />}
            onClick={handleAddTemplate}
            disabled={editingTemplateId !== null}
            size="small"
          >
            Add Template
          </Button>
        }
      />
      <div className={styles.section}>
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
  );
};

export default TemplatesTab;
