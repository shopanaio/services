"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Flex,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Switch,
  Tag,
  Typography,
} from "antd";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import { ProductComponentLogicOperator } from "@/graphql/types";
import type { IProductComponentPricingRulesModalPayload } from "../../modals";
import { useSyncProductComponentDependencyRules } from "../../hooks";
import {
  toProductComponentDependencyRuleDraft,
  toProductComponentDependencyRuleSyncInput,
  type ProductComponentDependencyRuleDraft,
} from "../../mappers";

export const ProductComponentPricingRulesModal = () => {
  const { payload, pop, setDirty } = useModalStackContext();
  const modalPayload = payload as IProductComponentPricingRulesModalPayload;
  const { syncDependencyRules, loading } =
    useSyncProductComponentDependencyRules();
  const [rules, setRules] = useState<ProductComponentDependencyRuleDraft[]>(
    () =>
      modalPayload.configuration.dependencyRules.map(
        toProductComponentDependencyRuleDraft,
      ),
  );
  const [error, setError] = useState<string | null>(null);
  const canSave = useMemo(
    () => rules.every((rule) => rule.name.trim().length > 0),
    [rules],
  );

  const updateRule = (
    index: number,
    patch: Partial<ProductComponentDependencyRuleDraft>,
  ) => {
    setRules((current) =>
      current.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule,
      ),
    );
    setDirty(true);
    setError(null);
  };

  const addRule = () => {
    const nextPriority =
      Math.max(0, ...rules.map((rule) => rule.priority)) + 100;
    setRules((current) => [
      ...current,
      {
        name: `Rule ${current.length + 1}`,
        enabled: true,
        priority: nextPriority,
        logicOperator: ProductComponentLogicOperator.And,
        conditionGroups: [],
        actions: [],
      },
    ]);
    setDirty(true);
  };

  const deleteRule = (index: number) => {
    setRules((current) =>
      current.filter((_, ruleIndex) => ruleIndex !== index),
    );
    setDirty(true);
  };

  const save = async () => {
    if (!canSave || loading) return;

    const result = await syncDependencyRules({
      configurationId: modalPayload.configuration.id,
      expectedRevision: modalPayload.expectedRevision,
      dependencyRules: rules.map(
        toProductComponentDependencyRuleSyncInput,
      ),
    });

    if (result.userErrors.length > 0) {
      setError(result.userErrors[0].message);
      return;
    }

    pop();
  };

  return (
    <ModalLayout
      name="product-component-pricing-rules"
      header={
        <ModalHeader
          name="product-component-pricing-rules"
          title="Pricing rules"
          onClose={pop}
          extra={
            <Button size="small" icon={<LuPlus />} onClick={addRule}>
              Add rule
            </Button>
          }
          submitButtonProps={{
            children: "Save",
            disabled: !canSave,
            loading,
            onClick: save,
          }}
        />
      }
    >
      <Flex vertical gap={12}>
        {error ? <Alert type="error" showIcon message={error} /> : null}
        {rules.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No pricing rules configured"
          />
        ) : (
          rules.map((rule, index) => (
            <Paper key={rule.id ?? `new-${index}`}>
              <Flex vertical gap={12}>
                <Flex align="center" gap={8}>
                  <Input
                    value={rule.name}
                    placeholder="Rule name"
                    onChange={(event) =>
                      updateRule(index, { name: event.target.value })
                    }
                  />
                  <Switch
                    checked={rule.enabled}
                    checkedChildren="Enabled"
                    unCheckedChildren="Disabled"
                    onChange={(enabled) => updateRule(index, { enabled })}
                  />
                  <Popconfirm
                    title="Delete pricing rule?"
                    onConfirm={() => deleteRule(index)}
                  >
                    <Button danger type="text" icon={<LuTrash2 />} />
                  </Popconfirm>
                </Flex>
                <Flex align="center" gap={8}>
                  <Typography.Text type="secondary">Priority</Typography.Text>
                  <InputNumber
                    min={0}
                    value={rule.priority}
                    onChange={(priority) =>
                      updateRule(index, { priority: priority ?? 0 })
                    }
                  />
                  <Typography.Text type="secondary">Rule logic</Typography.Text>
                  <Select
                    value={rule.logicOperator}
                    style={{ width: 100 }}
                    options={[
                      { value: ProductComponentLogicOperator.And, label: "AND" },
                      { value: ProductComponentLogicOperator.Or, label: "OR" },
                    ]}
                    onChange={(logicOperator) =>
                      updateRule(index, { logicOperator })
                    }
                  />
                  <Tag>{rule.conditionGroups.length} condition groups</Tag>
                  <Tag>{rule.actions.length} actions</Tag>
                </Flex>
              </Flex>
            </Paper>
          ))
        )}
      </Flex>
    </ModalLayout>
  );
};

export default ProductComponentPricingRulesModal;
