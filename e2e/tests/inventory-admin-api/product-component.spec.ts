import type {
  ApiOperationResult,
  ApiProductComponent,
  ApiProductComponentAdjustmentPriceRule,
  ApiProductComponentConfiguration,
  ApiProductComponentOperationInput,
  ApiProductComponentOverridePriceRule,
  OperationType,
} from '@codegen/admin-gql';
import type { ApiFixtures } from '@fixtures/api/api';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

type Api = ApiFixtures['api'];

interface ProductState {
  id: string;
  revision: number;
}

interface ProductReference extends ProductState {
  variantIds: string[];
  options: Array<{
    id: string;
    values: Array<{ id: string; name: string }>;
  }>;
}

async function createProduct(
  api: Api,
  title: string,
  withOptions = false,
): Promise<ProductReference> {
  const suffix = crypto.randomUUID().slice(0, 8);
  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: {
        title,
        handle: `product-component-${suffix}`,
        ...(withOptions
          ? {
              options: [
                {
                  name: 'Color',
                  slug: 'color',
                  displayType: 'SWATCH',
                  values: [
                    { name: 'Red', slug: 'red' },
                    { name: 'Blue', slug: 'blue' },
                  ],
                },
                {
                  name: 'Size',
                  slug: 'size',
                  displayType: 'DROPDOWN',
                  values: [
                    { name: 'Small', slug: 'small' },
                    { name: 'Large', slug: 'large' },
                  ],
                },
              ],
              variants: [{ handle: 'red-small' }, { handle: 'blue-large' }],
            }
          : {}),
      },
    },
  });

  const result = data.catalogMutation.productCreate;
  expect(result.userErrors).toHaveLength(0);
  if (!result.product) {
    throw new Error(`Failed to create product: ${title}`);
  }

  return {
    id: result.product.id,
    revision: result.product.revision,
    variantIds: result.product.variants.edges.map(({ node }) => node.id),
    options: result.product.options.map((option) => ({
      id: option.id,
      values: option.values.map((value) => ({ id: value.id, name: value.name })),
    })),
  };
}

async function applyComponentOperation(
  api: Api,
  product: ProductState,
  operation: ApiProductComponentOperationInput,
  expectedType: OperationType,
): Promise<{
  component: ApiProductComponent | null;
  operationResult: ApiOperationResult;
}> {
  const previousRevision = product.revision;
  const { data } = await api.admin.mutation('inventory-api/ProductComponentUpdate', {
    variables: {
      productId: product.id,
      
      operations: { components: [operation] },
    },
  });

  const result = data.catalogMutation.productUpdate;
  expect(result.userErrors).toHaveLength(0);
  expect(result.operationResults).toHaveLength(1);
  expect(result.operationResults[0]).toMatchObject({
    type: expectedType,
    applied: true,
    errors: [],
  });
  if (!result.product) {
    throw new Error(`Product update did not return product ${product.id}`);
  }
  expect(result.product.revision).toBe(previousRevision + 1);
  product.revision = result.product.revision;

  return {
    component: result.product.productComponent ?? null,
    operationResult: result.operationResults[0],
  };
}

async function createComponentConfiguration(
  api: Api,
  product: ProductState,
  name: string,
): Promise<ApiProductComponentConfiguration> {
  await applyComponentOperation(
    api,
    product,
    { action: 'SETTINGS_UPDATE', displayStyle: 'WIZARD' },
    'PRODUCT_COMPONENT_SETTINGS_UPDATE',
  );
  const created = await applyComponentOperation(
    api,
    product,
    {
      action: 'CONFIGURATION_CREATE',
      clientMutationId: `configuration-${crypto.randomUUID()}`,
      name,
    },
    'PRODUCT_COMPONENT_CONFIGURATION_CREATE',
  );
  const configuration = created.component?.configurations.find((item) => item.name === name);
  if (!configuration) {
    throw new Error(`Configuration create did not return ${name}`);
  }
  expect(created.operationResult.entityId).toBe(configuration.id);
  return configuration;
}

test.describe('Product Component API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('should manage the component and configuration lifecycle', async ({ api }) => {
    const owner = await createProduct(api, 'Lifecycle Desk');
    const configuration = await createComponentConfiguration(api, owner, 'Starter configuration');

    const configurationUpdate = await applyComponentOperation(
      api,
      owner,
      {
        action: 'CONFIGURATION_UPDATE',
        configurationId: configuration.id,
        name: 'Renamed configuration',
      },
      'PRODUCT_COMPONENT_CONFIGURATION_UPDATE',
    );
    expect(configurationUpdate.operationResult.entityId).toBe(configuration.id);
    expect(configurationUpdate.component?.configurations).toHaveLength(1);
    expect(configurationUpdate.component?.configurations[0]).toMatchObject({
      id: configuration.id,
      name: 'Renamed configuration',
    });

    const configurationDelete = await applyComponentOperation(
      api,
      owner,
      {
        action: 'CONFIGURATION_DELETE',
        configurationId: configuration.id,
      },
      'PRODUCT_COMPONENT_CONFIGURATION_DELETE',
    );
    expect(configurationDelete.operationResult.entityId).toBe(configuration.id);
    expect(configurationDelete.component?.configurations).toEqual([]);

    const remove = await applyComponentOperation(
      api,
      owner,
      { action: 'REMOVE' },
      'PRODUCT_COMPONENT_REMOVE',
    );
    expect(remove.component).toBeNull();

    const { data } = await api.admin.query('inventory-api/ProductComponentFindOne', {
      variables: { id: owner.id },
    });
    expect(data.catalogQuery.product?.revision).toBe(owner.revision);
    expect(data.catalogQuery.product?.productComponent).toBeNull();
  });

  test('should persist and return a complete component aggregate', async ({ api }) => {
    const owner = await createProduct(api, 'Configurable Desk');
    const reference = await createProduct(api, 'Desk Chair', true);
    const featuredImage = await api.admin.file.createExternal({
      provider: 'URL',
      externalId: `component-image-${crypto.randomUUID()}`,
      url: 'https://example.com/component-chair.jpg',
      originalName: 'component-chair.jpg',
    });

    const settings = await applyComponentOperation(
      api,
      owner,
      { action: 'SETTINGS_UPDATE', displayStyle: 'WIZARD' },
      'PRODUCT_COMPONENT_SETTINGS_UPDATE',
    );
    expect(settings.component).toMatchObject({
      product: { id: owner.id },
      displayStyle: 'WIZARD',
      configurations: [],
    });
    expect(settings.component?.id).toBeTruthy();
    expect(settings.component?.createdAt).toBeTruthy();
    expect(settings.component?.updatedAt).toBeTruthy();

    const configurationCreate = await applyComponentOperation(
      api,
      owner,
      {
        action: 'CONFIGURATION_CREATE',
        clientMutationId: 'primary-configuration',
        name: 'Starter configuration',
      },
      'PRODUCT_COMPONENT_CONFIGURATION_CREATE',
    );
    expect(configurationCreate.operationResult.clientMutationId).toBe('primary-configuration');
    const configuration = configurationCreate.component?.configurations[0];
    if (!configuration) {
      throw new Error('Configuration create did not return a configuration');
    }
    expect(configurationCreate.operationResult.entityId).toBe(configuration.id);
    expect(configuration).toMatchObject({
      product: { id: owner.id },
      name: 'Starter configuration',
      variants: [],
      groups: [],
      pricingTemplates: [],
      dependencyRules: [],
    });

    const configurationUpdate = await applyComponentOperation(
      api,
      owner,
      {
        action: 'CONFIGURATION_UPDATE',
        configurationId: configuration.id,
        name: 'Premium configuration',
      },
      'PRODUCT_COMPONENT_CONFIGURATION_UPDATE',
    );
    expect(configurationUpdate.operationResult.entityId).toBe(configuration.id);
    expect(configurationUpdate.component?.configurations[0].name).toBe('Premium configuration');

    const pricingTemplatesSync = await applyComponentOperation(
      api,
      owner,
      {
        action: 'PRICING_TEMPLATES_SYNC',
        configurationId: configuration.id,
        pricingTemplates: [
          {
            name: 'Base price',
            sortIndex: 0,
            priceRule: { strategy: 'BASE' },
          },
          {
            name: 'Fixed surcharge',
            sortIndex: 1,
            priceRule: {
              strategy: 'ADJUSTMENT',
              operation: 'INCREASE',
              valueType: 'FIXED_AMOUNT',
              amounts: [{ currency: 'USD', amountMinor: '250' }],
            },
          },
          {
            name: 'Fixed price',
            sortIndex: 2,
            priceRule: {
              strategy: 'OVERRIDE',
              amounts: [{ currency: 'USD', amountMinor: '1999' }],
            },
          },
          {
            name: 'Included',
            sortIndex: 3,
            priceRule: { strategy: 'FREE' },
          },
        ],
      },
      'PRODUCT_COMPONENT_PRICING_TEMPLATES_SYNC',
    );
    const syncedConfiguration = pricingTemplatesSync.component?.configurations[0];
    if (!syncedConfiguration) {
      throw new Error('Pricing template sync did not return the configuration');
    }
    expect(pricingTemplatesSync.operationResult.entityId).toBe(configuration.id);
    expect(syncedConfiguration.pricingTemplates.map((template) => template.name)).toEqual([
      'Base price',
      'Fixed surcharge',
      'Fixed price',
      'Included',
    ]);
    expect(
      syncedConfiguration.pricingTemplates.map((template) => template.priceRule.strategy),
    ).toEqual(['BASE', 'ADJUSTMENT', 'OVERRIDE', 'FREE']);
    const includedTemplate = syncedConfiguration.pricingTemplates.find(
      (template) => template.name === 'Included',
    );
    if (!includedTemplate) {
      throw new Error('Included pricing template was not returned');
    }

    const colorOption = reference.options[0];
    const sizeOption = reference.options[1];
    const groupsSync = await applyComponentOperation(
      api,
      owner,
      {
        action: 'GROUPS_SYNC',
        configurationId: configuration.id,
        groups: [
          {
            title: 'Choose desk accessories',
            minSelection: 1,
            maxSelection: 2,
            sortIndex: 0,
            items: [
              {
                itemType: 'PRODUCT',
                refProductId: reference.id,
                featuredImageId: featuredImage.id,
                minQty: 1,
                maxQty: 4,
                defaultQty: 2,
                priceRule: {
                  strategy: 'ADJUSTMENT',
                  operation: 'DECREASE',
                  valueType: 'PERCENTAGE',
                  percentageBps: 1250,
                },
                optionSelections: [
                  {
                    optionId: colorOption.id,
                    parentOptionId: sizeOption.id,
                    sortIndex: 0,
                    values: [
                      {
                        optionValueId: colorOption.values[0].id,
                        value: colorOption.values[0].name,
                        status: 'SELECTED',
                        sortIndex: 0,
                      },
                      {
                        value: 'Legacy Green',
                        status: 'UNAVAILABLE',
                        sortIndex: 1,
                      },
                    ],
                  },
                ],
                title: 'Chair color',
                visible: true,
                selected: true,
                sortIndex: 0,
              },
              {
                itemType: 'VARIANT',
                refVariantId: reference.variantIds[1],
                minQty: 0,
                maxQty: null,
                defaultQty: 0,
                pricingTemplateId: includedTemplate.id,
                title: 'Blue large chair',
                visible: true,
                selected: false,
                sortIndex: 1,
              },
            ],
          },
        ],
      },
      'PRODUCT_COMPONENT_GROUPS_SYNC',
    );
    expect(groupsSync.operationResult.entityId).toBe(configuration.id);
    const group = groupsSync.component?.configurations[0].groups[0];
    if (!group) {
      throw new Error('Group sync did not return a group');
    }
    expect(group).toMatchObject({
      title: 'Choose desk accessories',
      minSelection: 1,
      maxSelection: 2,
      sortIndex: 0,
    });
    expect(group.createdAt).toBeTruthy();
    expect(group.updatedAt).toBeTruthy();
    expect(group.items).toHaveLength(2);

    const productItem = group.items[0];
    const variantItem = group.items[1];
    expect(productItem).toMatchObject({
      group: { id: group.id },
      itemType: 'PRODUCT',
      sortIndex: 0,
      refProduct: { id: reference.id },
      refVariant: null,
      featuredImage: {
        id: featuredImage.id,
        originalName: 'component-chair.jpg',
        url: featuredImage.url,
      },
      minQty: 1,
      maxQty: 4,
      defaultQty: 2,
      title: 'Chair color',
      visible: true,
      selected: true,
    });
    const percentageRule = productItem.priceRule as ApiProductComponentAdjustmentPriceRule;
    expect(percentageRule).toMatchObject({
      __typename: 'ProductComponentAdjustmentPriceRule',
      strategy: 'ADJUSTMENT',
      operation: 'DECREASE',
      valueType: 'PERCENTAGE',
      amounts: [],
      percentageBps: 1250,
    });
    expect(productItem.pricingTemplate).toBeNull();
    expect(productItem.createdAt).toBeTruthy();
    expect(productItem.updatedAt).toBeTruthy();

    const optionSelection = productItem.optionSelections[0];
    expect(optionSelection).toMatchObject({
      option: { id: colorOption.id, name: 'Color', slug: 'color' },
      parentOption: { id: sizeOption.id, name: 'Size', slug: 'size' },
      sortIndex: 0,
    });
    expect(optionSelection.values).toHaveLength(2);
    expect(optionSelection.values[0]).toMatchObject({
      optionValue: { id: colorOption.values[0].id, name: 'Red', slug: 'red' },
      value: 'Red',
      status: 'SELECTED',
      sortIndex: 0,
    });
    expect(optionSelection.values[1]).toMatchObject({
      optionValue: null,
      value: 'Legacy Green',
      status: 'UNAVAILABLE',
      sortIndex: 1,
    });

    expect(variantItem).toMatchObject({
      group: { id: group.id },
      itemType: 'VARIANT',
      sortIndex: 1,
      refProduct: null,
      refVariant: { id: reference.variantIds[1] },
      featuredImage: null,
      minQty: 0,
      maxQty: null,
      defaultQty: 0,
      priceRule: null,
      pricingTemplate: {
        id: includedTemplate.id,
        name: 'Included',
        sortIndex: 3,
        priceRule: { strategy: 'FREE' },
      },
      optionSelections: [],
      title: 'Blue large chair',
      visible: true,
      selected: false,
    });

    const dependencyRulesSync = await applyComponentOperation(
      api,
      owner,
      {
        action: 'DEPENDENCY_RULES_SYNC',
        configurationId: configuration.id,
        dependencyRules: [
          {
            name: 'Chair dependency',
            enabled: true,
            priority: 10,
            logicOperator: 'AND',
            conditionGroups: [
              {
                logicOperator: 'AND',
                sortIndex: 0,
                conditions: [
                  {
                    category: 'STATE_CHECK',
                    subject: 'ITEM_SELECTED',
                    operator: 'IS_SELECTED',
                    targetType: 'ITEM',
                    targetId: productItem.id,
                    sortIndex: 0,
                  },
                  {
                    category: 'NUMERIC',
                    subject: 'ITEM_QTY',
                    operator: 'GTE',
                    targetType: 'ITEM',
                    targetId: productItem.id,
                    value: 2,
                    sortIndex: 1,
                  },
                ],
              },
              {
                logicOperator: 'OR',
                sortIndex: 1,
                conditions: [
                  {
                    category: 'NUMERIC',
                    subject: 'GROUP_TOTAL_QTY',
                    operator: 'LTE',
                    targetType: 'GROUP',
                    targetId: group.id,
                    value: 5,
                    sortIndex: 0,
                  },
                ],
              },
            ],
            actions: [
              {
                actionType: 'SHOW',
                targetType: 'ITEM',
                targetId: variantItem.id,
                stackable: false,
                sortIndex: 0,
              },
              {
                actionType: 'SET_REQUIRED',
                targetType: 'GROUP',
                targetId: group.id,
                requiredValue: true,
                stackable: false,
                sortIndex: 1,
              },
              {
                actionType: 'ADJUST_PRICE',
                targetType: 'CONFIGURATION',
                targetId: configuration.id,
                priceRule: {
                  strategy: 'ADJUSTMENT',
                  operation: 'INCREASE',
                  valueType: 'FIXED_AMOUNT',
                  amounts: [{ currency: 'USD', amountMinor: '500' }],
                },
                stackable: true,
                sortIndex: 2,
              },
            ],
          },
        ],
      },
      'PRODUCT_COMPONENT_DEPENDENCY_RULES_SYNC',
    );
    expect(dependencyRulesSync.operationResult.entityId).toBe(configuration.id);
    const completeComponent = dependencyRulesSync.component;
    const completeConfiguration = completeComponent?.configurations[0];
    const dependencyRule = completeConfiguration?.dependencyRules[0];
    if (!completeComponent || !completeConfiguration || !dependencyRule) {
      throw new Error('Dependency sync did not return the complete component aggregate');
    }

    expect(completeComponent).toMatchObject({
      product: { id: owner.id },
      displayStyle: 'WIZARD',
    });
    expect(completeConfiguration).toMatchObject({
      id: configuration.id,
      product: { id: owner.id },
      name: 'Premium configuration',
      variants: [],
    });
    expect(completeConfiguration.createdAt).toBeTruthy();
    expect(completeConfiguration.updatedAt).toBeTruthy();
    expect(dependencyRule).toMatchObject({
      name: 'Chair dependency',
      enabled: true,
      priority: 10,
      logicOperator: 'AND',
    });
    expect(dependencyRule.createdAt).toBeTruthy();
    expect(dependencyRule.updatedAt).toBeTruthy();
    expect(dependencyRule.conditionGroups).toHaveLength(2);
    expect(dependencyRule.conditionGroups[0]).toMatchObject({
      logicOperator: 'AND',
      sortIndex: 0,
      conditions: [
        {
          category: 'STATE_CHECK',
          subject: 'ITEM_SELECTED',
          operator: 'IS_SELECTED',
          targetType: 'ITEM',
          targetId: productItem.id,
          value: null,
          sortIndex: 0,
        },
        {
          category: 'NUMERIC',
          subject: 'ITEM_QTY',
          operator: 'GTE',
          targetType: 'ITEM',
          targetId: productItem.id,
          value: 2,
          sortIndex: 1,
        },
      ],
    });
    expect(dependencyRule.conditionGroups[1]).toMatchObject({
      logicOperator: 'OR',
      sortIndex: 1,
      conditions: [
        {
          category: 'NUMERIC',
          subject: 'GROUP_TOTAL_QTY',
          operator: 'LTE',
          targetType: 'GROUP',
          targetId: group.id,
          value: 5,
          sortIndex: 0,
        },
      ],
    });
    expect(dependencyRule.actions).toHaveLength(3);
    expect(dependencyRule.actions[0]).toMatchObject({
      actionType: 'SHOW',
      targetType: 'ITEM',
      targetId: variantItem.id,
      requiredValue: null,
      priceRule: null,
      stackable: false,
      sortIndex: 0,
    });
    expect(dependencyRule.actions[1]).toMatchObject({
      actionType: 'SET_REQUIRED',
      targetType: 'GROUP',
      targetId: group.id,
      requiredValue: true,
      priceRule: null,
      stackable: false,
      sortIndex: 1,
    });
    const fixedAdjustment = dependencyRule.actions[2]
      .priceRule as ApiProductComponentAdjustmentPriceRule;
    expect(dependencyRule.actions[2]).toMatchObject({
      actionType: 'ADJUST_PRICE',
      targetType: 'CONFIGURATION',
      targetId: configuration.id,
      requiredValue: null,
      stackable: true,
      sortIndex: 2,
    });
    expect(fixedAdjustment).toMatchObject({
      __typename: 'ProductComponentAdjustmentPriceRule',
      strategy: 'ADJUSTMENT',
      operation: 'INCREASE',
      valueType: 'FIXED_AMOUNT',
      percentageBps: null,
    });
    expect(fixedAdjustment.amounts).toHaveLength(1);
    expect(fixedAdjustment.amounts[0].currency).toBe('USD');
    expect(Number(fixedAdjustment.amounts[0].amountMinor)).toBe(500);

    const overrideTemplate = completeConfiguration.pricingTemplates.find(
      (template) => template.name === 'Fixed price',
    );
    if (!overrideTemplate) {
      throw new Error('Fixed price template was not returned');
    }
    const projectedOverrideTemplate = overrideTemplate as typeof overrideTemplate & {
      priceRuleById: { id: string };
      priceRuleByAlias: { kind: string };
    };
    const overrideRule = overrideTemplate.priceRule as ApiProductComponentOverridePriceRule;
    expect(overrideRule).toMatchObject({
      __typename: 'ProductComponentOverridePriceRule',
      strategy: 'OVERRIDE',
    });
    expect(overrideRule.amounts).toHaveLength(1);
    expect(overrideRule.amounts[0].currency).toBe('USD');
    expect(Number(overrideRule.amounts[0].amountMinor)).toBe(1999);
    expect(projectedOverrideTemplate.priceRuleById.id).toBe(overrideRule.id);
    expect(projectedOverrideTemplate.priceRuleByAlias.kind).toBe('OVERRIDE');

    const { data: readData } = await api.admin.query('inventory-api/ProductComponentFindOne', {
      variables: { id: owner.id },
    });
    expect(readData.catalogQuery.product?.productComponent).toEqual(completeComponent);
  });

  test('should update retained templates and delete omitted templates during sync', async ({
    api,
  }) => {
    const owner = await createProduct(api, 'Pricing Template Sync Desk');
    const configuration = await createComponentConfiguration(
      api,
      owner,
      'Pricing template sync configuration',
    );

    const initialTemplates = await applyComponentOperation(
      api,
      owner,
      {
        action: 'PRICING_TEMPLATES_SYNC',
        configurationId: configuration.id,
        pricingTemplates: [
          { name: 'Retained template', sortIndex: 0, priceRule: { strategy: 'BASE' } },
          { name: 'Removed template', sortIndex: 1, priceRule: { strategy: 'FREE' } },
        ],
      },
      'PRODUCT_COMPONENT_PRICING_TEMPLATES_SYNC',
    );
    const templates = initialTemplates.component?.configurations[0].pricingTemplates;
    if (!templates || templates.length !== 2) {
      throw new Error('Initial pricing template sync did not return two templates');
    }
    const retainedTemplate = templates.find((template) => template.name === 'Retained template');
    const removedTemplate = templates.find((template) => template.name === 'Removed template');
    if (!retainedTemplate || !removedTemplate) {
      throw new Error('Initial pricing templates were not returned');
    }

    const updatedTemplates = await applyComponentOperation(
      api,
      owner,
      {
        action: 'PRICING_TEMPLATES_SYNC',
        configurationId: configuration.id,
        pricingTemplates: [
          {
            id: retainedTemplate.id,
            name: 'Updated template',
            sortIndex: 3,
            priceRule: {
              strategy: 'OVERRIDE',
              amounts: [{ currency: 'USD', amountMinor: '1299' }],
            },
          },
        ],
      },
      'PRODUCT_COMPONENT_PRICING_TEMPLATES_SYNC',
    );
    const syncedTemplates = updatedTemplates.component?.configurations[0].pricingTemplates;
    expect(syncedTemplates).toHaveLength(1);
    expect(syncedTemplates?.[0]).toMatchObject({
      id: retainedTemplate.id,
      name: 'Updated template',
      sortIndex: 3,
      priceRule: { strategy: 'OVERRIDE' },
    });
    expect(syncedTemplates?.map((template) => template.id)).not.toContain(removedTemplate.id);

    const { data } = await api.admin.query('inventory-api/ProductComponentFindOne', {
      variables: { id: owner.id },
    });
    expect(data.catalogQuery.product?.revision).toBe(owner.revision);
    expect(data.catalogQuery.product?.productComponent).toEqual(updatedTemplates.component);
  });

  test('should update retained groups and delete omitted groups during sync', async ({ api }) => {
    const owner = await createProduct(api, 'Group Sync Desk');
    const configuration = await createComponentConfiguration(
      api,
      owner,
      'Group sync configuration',
    );

    const initialGroups = await applyComponentOperation(
      api,
      owner,
      {
        action: 'GROUPS_SYNC',
        configurationId: configuration.id,
        groups: [
          {
            title: 'Retained group',
            minSelection: 0,
            maxSelection: 1,
            sortIndex: 0,
            items: [],
          },
          {
            title: 'Removed group',
            minSelection: null,
            maxSelection: null,
            sortIndex: 1,
            items: [],
          },
        ],
      },
      'PRODUCT_COMPONENT_GROUPS_SYNC',
    );
    const groups = initialGroups.component?.configurations[0].groups;
    if (!groups || groups.length !== 2) {
      throw new Error('Initial group sync did not return two groups');
    }
    const retainedGroup = groups.find((group) => group.title === 'Retained group');
    const removedGroup = groups.find((group) => group.title === 'Removed group');
    if (!retainedGroup || !removedGroup) {
      throw new Error('Initial groups were not returned');
    }

    const updatedGroups = await applyComponentOperation(
      api,
      owner,
      {
        action: 'GROUPS_SYNC',
        configurationId: configuration.id,
        groups: [
          {
            id: retainedGroup.id,
            title: 'Updated group',
            minSelection: 1,
            maxSelection: 2,
            sortIndex: 4,
            items: [],
          },
        ],
      },
      'PRODUCT_COMPONENT_GROUPS_SYNC',
    );
    const syncedGroups = updatedGroups.component?.configurations[0].groups;
    expect(syncedGroups).toEqual([
      expect.objectContaining({
        id: retainedGroup.id,
        title: 'Updated group',
        minSelection: 1,
        maxSelection: 2,
        sortIndex: 4,
        items: [],
      }),
    ]);
    expect(syncedGroups?.map((group) => group.id)).not.toContain(removedGroup.id);

    const { data } = await api.admin.query('inventory-api/ProductComponentFindOne', {
      variables: { id: owner.id },
    });
    expect(data.catalogQuery.product?.revision).toBe(owner.revision);
    expect(data.catalogQuery.product?.productComponent).toEqual(updatedGroups.component);
  });

  test('should update retained rules and delete omitted rules during sync', async ({ api }) => {
    const owner = await createProduct(api, 'Dependency Rule Sync Desk');
    const configuration = await createComponentConfiguration(
      api,
      owner,
      'Dependency rule sync configuration',
    );

    const initialRules = await applyComponentOperation(
      api,
      owner,
      {
        action: 'DEPENDENCY_RULES_SYNC',
        configurationId: configuration.id,
        dependencyRules: [
          {
            name: 'Retained rule',
            enabled: true,
            priority: 1,
            logicOperator: 'AND',
            conditionGroups: [],
            actions: [],
          },
          {
            name: 'Removed rule',
            enabled: true,
            priority: 2,
            logicOperator: 'OR',
            conditionGroups: [],
            actions: [],
          },
        ],
      },
      'PRODUCT_COMPONENT_DEPENDENCY_RULES_SYNC',
    );
    const rules = initialRules.component?.configurations[0].dependencyRules;
    if (!rules || rules.length !== 2) {
      throw new Error('Initial dependency rule sync did not return two rules');
    }
    const retainedRule = rules.find((rule) => rule.name === 'Retained rule');
    const removedRule = rules.find((rule) => rule.name === 'Removed rule');
    if (!retainedRule || !removedRule) {
      throw new Error('Initial dependency rules were not returned');
    }

    const updatedRules = await applyComponentOperation(
      api,
      owner,
      {
        action: 'DEPENDENCY_RULES_SYNC',
        configurationId: configuration.id,
        dependencyRules: [
          {
            id: retainedRule.id,
            name: 'Updated rule',
            enabled: false,
            priority: 7,
            logicOperator: 'OR',
            conditionGroups: [],
            actions: [],
          },
        ],
      },
      'PRODUCT_COMPONENT_DEPENDENCY_RULES_SYNC',
    );
    const syncedRules = updatedRules.component?.configurations[0].dependencyRules;
    expect(syncedRules).toEqual([
      expect.objectContaining({
        id: retainedRule.id,
        name: 'Updated rule',
        enabled: false,
        priority: 7,
        logicOperator: 'OR',
        conditionGroups: [],
        actions: [],
      }),
    ]);
    expect(syncedRules?.map((rule) => rule.id)).not.toContain(removedRule.id);

    const { data } = await api.admin.query('inventory-api/ProductComponentFindOne', {
      variables: { id: owner.id },
    });
    expect(data.catalogQuery.product?.revision).toBe(owner.revision);
    expect(data.catalogQuery.product?.productComponent).toEqual(updatedRules.component);
  });

  test('should reject component operations without an expected revision', async ({ api }) => {
    const owner = await createProduct(api, 'Revision Guard Desk');
    const configuration = await createComponentConfiguration(
      api,
      owner,
      'Revision guard configuration',
    );
    const previousRevision = owner.revision;

    const { data } = await api.admin.mutation('inventory-api/ProductComponentUpdate', {
      variables: {
        productId: owner.id,
        operations: {
          components: [{ action: 'CONFIGURATION_DELETE', configurationId: configuration.id }],
        },
      },
      throwOnError: false,
    });
    const result = data.catalogMutation.productUpdate;
    expect(result.product).toBeNull();
    expect(result.userErrors).toContainEqual(
      expect.objectContaining({
        code: 'EXPECTED_REVISION_REQUIRED',
        field: ['expectedRevision'],
      }),
    );
    expect(result.operationResults).toEqual([
      expect.objectContaining({
        type: 'PRODUCT_COMPONENT_CONFIGURATION_DELETE',
        applied: false,
      }),
    ]);

    const { data: readData } = await api.admin.query('inventory-api/ProductComponentFindOne', {
      variables: { id: owner.id },
    });
    expect(readData.catalogQuery.product?.revision).toBe(previousRevision);
    expect(readData.catalogQuery.product?.productComponent?.configurations).toEqual([
      expect.objectContaining({ id: configuration.id }),
    ]);
  });

  test('should report partial failure without applying an invalid sync operation', async ({
    api,
  }) => {
    const owner = await createProduct(api, 'Partial Failure Desk');
    const configuration = await createComponentConfiguration(
      api,
      owner,
      'Partial failure configuration',
    );
    const seeded = await applyComponentOperation(
      api,
      owner,
      {
        action: 'GROUPS_SYNC',
        configurationId: configuration.id,
        groups: [
          {
            title: 'Stable group',
            minSelection: 0,
            maxSelection: 2,
            sortIndex: 0,
            items: [],
          },
        ],
      },
      'PRODUCT_COMPONENT_GROUPS_SYNC',
    );
    const stableGroup = seeded.component?.configurations[0].groups[0];
    if (!stableGroup) {
      throw new Error('Initial group sync did not return the stable group');
    }
    const previousRevision = owner.revision;

    const { data } = await api.admin.mutation('inventory-api/ProductComponentUpdate', {
      variables: {
        productId: owner.id,
        
        operations: {
          components: [
            { action: 'SETTINGS_UPDATE', displayStyle: 'FLAT' },
            {
              action: 'GROUPS_SYNC',
              configurationId: configuration.id,
              groups: [
                {
                  id: stableGroup.id,
                  title: 'Must not be persisted',
                  minSelection: 3,
                  maxSelection: 1,
                  sortIndex: 5,
                  items: [],
                },
              ],
            },
          ],
        },
      },
      throwOnError: false,
    });
    const result = data.catalogMutation.productUpdate;
    expect(result.userErrors).toContainEqual(expect.objectContaining({ code: 'INVALID_RANGE' }));
    expect(result.operationResults).toHaveLength(2);
    expect(result.operationResults[0]).toMatchObject({
      type: 'PRODUCT_COMPONENT_SETTINGS_UPDATE',
      applied: true,
      errors: [],
    });
    expect(result.operationResults[1]).toMatchObject({
      type: 'PRODUCT_COMPONENT_GROUPS_SYNC',
      applied: false,
      errors: [expect.objectContaining({ code: 'INVALID_RANGE' })],
    });
    expect(result.product?.revision).toBe(previousRevision + 1);
    expect(result.product?.productComponent).toMatchObject({
      displayStyle: 'FLAT',
      configurations: [
        expect.objectContaining({
          id: configuration.id,
          groups: [
            expect.objectContaining({
              id: stableGroup.id,
              title: 'Stable group',
              minSelection: 0,
              maxSelection: 2,
              sortIndex: 0,
            }),
          ],
        }),
      ],
    });

    const { data: readData } = await api.admin.query('inventory-api/ProductComponentFindOne', {
      variables: { id: owner.id },
    });
    expect(readData.catalogQuery.product?.revision).toBe(previousRevision + 1);
    expect(readData.catalogQuery.product?.productComponent).toEqual(
      result.product?.productComponent,
    );
  });
});
