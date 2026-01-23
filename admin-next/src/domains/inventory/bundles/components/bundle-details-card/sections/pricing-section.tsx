"use client";

import { Paper, PaperHeader } from "@/ui-kit/paper";
import { PricingRulesTab } from "@/domains/inventory/products/modals/edit-components-modal/components";
import type {
  PricingRuleTemplate,
  IDependencyRule,
  IComponentGroup,
} from "@/domains/inventory/products/modals/edit-components-modal/types";

// ============================================================================
// Props
// ============================================================================

interface IPricingSectionProps {
  pricingTemplates: PricingRuleTemplate[];
  onPricingTemplatesChange: (templates: PricingRuleTemplate[]) => void;
  dependencyRules: IDependencyRule[];
  onDependencyRulesChange: (rules: IDependencyRule[]) => void;
  groups: IComponentGroup[];
}

// ============================================================================
// Component
// ============================================================================

export const PricingSection = ({
  pricingTemplates,
  onPricingTemplatesChange,
  dependencyRules,
  onDependencyRulesChange,
  groups,
}: IPricingSectionProps) => {
  return (
    <Paper>
      <PaperHeader title="Pricing & Rules" />
      <PricingRulesTab
        pricingTemplates={pricingTemplates}
        onPricingTemplatesChange={onPricingTemplatesChange}
        dependencyRules={dependencyRules}
        onDependencyRulesChange={onDependencyRulesChange}
        groups={groups}
      />
    </Paper>
  );
};
