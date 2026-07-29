"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Alert,
  App,
  Button,
  Checkbox,
  Flex,
  Input,
  InputNumber,
  Radio,
  Select,
  Tag,
  Typography,
} from "antd";
import { LuListPlus } from "react-icons/lu";
import {
  DiscountAllocationMethod,
  DiscountKind,
  DiscountRequirementType,
  DiscountTargetType,
  DiscountValueType,
} from "@/graphql/types";
import {
  ModalHeader,
  ModalLayout,
  useModalStackContext,
} from "@/layouts/modals";
import {
  useCategoryPicker,
  useProductPicker,
  useVariantPicker,
} from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useUpdateDiscount } from "../../hooks";
import {
  buildDiscountValueTargetsUpdateInput,
  createDiscountValueTargetsFormValues,
  validateDiscountValueTargetsForm,
  type DiscountTargetEditorItem,
  type DiscountValueTargetsFormValues,
} from "../../mappers";
import type { IDiscountValueTargetsEditModalPayload } from "../../modals";
import { useEditValueTargetsModalStyles } from "./edit-value-targets-modal.styles";

const TARGET_OPTIONS = [
  {
    value: DiscountTargetType.AllProducts,
    title: "All products",
    description: "Use the complete catalog.",
  },
  {
    value: DiscountTargetType.Products,
    title: "Specific products",
    description: "Select individual products.",
  },
  {
    value: DiscountTargetType.Variants,
    title: "Specific variants",
    description: "Select exact variants.",
  },
  {
    value: DiscountTargetType.Categories,
    title: "Categories",
    description: "Select catalog categories.",
  },
] as const;

const TARGET_COPY = {
  [DiscountTargetType.Products]: {
    singular: "product",
    plural: "products",
  },
  [DiscountTargetType.Variants]: {
    singular: "variant",
    plural: "variants",
  },
  [DiscountTargetType.Categories]: {
    singular: "category",
    plural: "categories",
  },
} as const;

function getTargetCopy(targetType: DiscountTargetType) {
  if (targetType === DiscountTargetType.Products) {
    return TARGET_COPY[DiscountTargetType.Products];
  }
  if (targetType === DiscountTargetType.Variants) {
    return TARGET_COPY[DiscountTargetType.Variants];
  }
  if (targetType === DiscountTargetType.Categories) {
    return TARGET_COPY[DiscountTargetType.Categories];
  }
  return null;
}

const serializeValues = (values: DiscountValueTargetsFormValues) =>
  JSON.stringify({
    ...values,
    targets: values.targets.map(({ id }) => id),
    qualifierTargets: values.qualifierTargets.map(({ id }) => id),
  });

function mergePickerSelection(
  current: DiscountTargetEditorItem[],
  entities: IPickableEntity[],
  ids: string[],
): DiscountTargetEditorItem[] {
  const titleById = new Map(
    current.map((target) => [target.id, target.title]),
  );
  entities.forEach((entity) => titleById.set(entity.id, entity.title));

  return ids.map((id) => ({
    id,
    title: titleById.get(id) ?? id,
  }));
}

function getCurrencySymbol(currency: string): string {
  return (
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency
  );
}

interface TargetSelectionEditorProps {
  testIdPrefix: string;
  title: string;
  targetType: DiscountTargetType;
  targets: DiscountTargetEditorItem[];
  onChange: (
    targetType: DiscountTargetType,
    targets: DiscountTargetEditorItem[],
  ) => void;
}

function TargetSelectionEditor({
  testIdPrefix,
  title,
  targetType,
  targets,
  onChange,
}: TargetSelectionEditorProps) {
  const { styles, cx } = useEditValueTargetsModalStyles();
  const selectedIds = targets.map((target) => target.id);
  const targetCopy = getTargetCopy(targetType);
  const handlePickerConfirm = useCallback(
    (entities: IPickableEntity[], ids: string[]) => {
      onChange(
        targetType,
        mergePickerSelection(targets, entities, ids),
      );
    },
    [onChange, targetType, targets],
  );
  const productPicker = useProductPicker({
    selectionMode: "multi",
    initialSelection: selectedIds,
    onConfirm: handlePickerConfirm,
  });
  const variantPicker = useVariantPicker({
    selectionMode: "multi",
    initialSelection: selectedIds,
    onConfirm: handlePickerConfirm,
  });
  const categoryPicker = useCategoryPicker({
    selectionMode: "multi",
    initialSelection: selectedIds,
    onConfirm: handlePickerConfirm,
  });
  const openPicker = useCallback(() => {
    if (targetType === DiscountTargetType.Products) {
      productPicker.openPicker();
    } else if (targetType === DiscountTargetType.Variants) {
      variantPicker.openPicker();
    } else if (targetType === DiscountTargetType.Categories) {
      categoryPicker.openPicker();
    }
  }, [categoryPicker, productPicker, targetType, variantPicker]);

  return (
    <>
      <Paper className={styles.section} data-testid={`${testIdPrefix}-section`}>
        <PaperHeader title={title} />
        <Radio.Group
          className={styles.targetGroup}
          value={targetType}
          data-testid={`${testIdPrefix}-type`}
          onChange={(event) =>
            onChange(event.target.value as DiscountTargetType, [])
          }
        >
          {TARGET_OPTIONS.map((option) => (
            <Radio
              key={option.value}
              value={option.value}
              data-testid={`${testIdPrefix}-${option.value.toLowerCase()}`}
              className={cx(
                styles.targetOption,
                targetType === option.value &&
                  styles.targetOptionSelected,
              )}
            >
              <span className={styles.targetCopy}>
                <Typography.Text className={styles.targetTitle}>
                  {option.title}
                </Typography.Text>
                <Typography.Text className={styles.targetDescription}>
                  {option.description}
                </Typography.Text>
              </span>
            </Radio>
          ))}
        </Radio.Group>
      </Paper>

      {targetCopy ? (
        <Paper
          className={styles.section}
          data-testid={`${testIdPrefix}-selection-section`}
        >
          <PaperHeader
            title={`Selected ${targetCopy.plural}`}
            actions={
              <Typography.Text type="secondary">
                {targets.length} selected
              </Typography.Text>
            }
          />
          <div className={styles.field}>
            <Typography.Text strong className={styles.fieldLabel}>
              {targetCopy.plural[0].toUpperCase() +
                targetCopy.plural.slice(1)}{" "}
              *
            </Typography.Text>
            <Flex gap={8} className={styles.pickerRow}>
              <Input
                readOnly
                className={styles.pickerSummary}
                value={
                  targets.length === 0
                    ? ""
                    : `${targets.length} ${targetCopy.plural} selected`
                }
                placeholder={`No ${targetCopy.plural} selected`}
              />
              <Button icon={<LuListPlus />} onClick={openPicker}>
                Select
              </Button>
            </Flex>
          </div>
          {targets.length > 0 ? (
            <div className={styles.selectedTags}>
              {targets.map((target) => (
                <Tag
                  key={target.id}
                  closable
                  className={styles.selectedTag}
                  onClose={() =>
                    onChange(
                      targetType,
                      targets.filter((item) => item.id !== target.id),
                    )
                  }
                >
                  {target.title}
                </Tag>
              ))}
            </div>
          ) : null}
        </Paper>
      ) : null}
    </>
  );
}

export function EditValueTargetsModal() {
  const { styles, cx } = useEditValueTargetsModalStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const { discount, onSaved } =
    payload as IDiscountValueTargetsEditModalPayload;
  const mutation = useUpdateDiscount();
  const [values, setValues] = useState<DiscountValueTargetsFormValues>(() =>
    createDiscountValueTargetsFormValues(discount),
  );
  const [initialSnapshot] = useState(() =>
    serializeValues(createDiscountValueTargetsFormValues(discount)),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const dirty = serializeValues(values) !== initialSnapshot;
  const currencySymbol = getCurrencySymbol(discount.currency);
  const isAmountOff =
    discount.kind === DiscountKind.AmountOffProducts ||
    discount.kind === DiscountKind.AmountOffOrder;
  const isBuyXGetY = discount.kind === DiscountKind.BuyXGetY;
  const isFreeShipping = discount.kind === DiscountKind.FreeShipping;

  useEffect(() => {
    setDirty(dirty);
  }, [dirty, setDirty]);

  const updateValues = useCallback(
    (changes: Partial<DiscountValueTargetsFormValues>) => {
      setValues((current) => ({ ...current, ...changes }));
      setFormError(null);
    },
    [],
  );

  const save = useCallback(async () => {
    const validationErrors = validateDiscountValueTargetsForm(
      discount,
      values,
    );
    if (validationErrors.length > 0) {
      setFormError(validationErrors.join(" "));
      return;
    }

    const result = await mutation.updateDiscount({
      discountId: discount.id,
      expectedRevision: discount.revision,
      operations: buildDiscountValueTargetsUpdateInput(discount, values),
    });

    if (!result.discount || result.errors.length > 0) {
      setFormError(
        result.errors.map((error) => error.message).join(" ") ||
          "Unable to update discount.",
      );
      return;
    }

    setDirty(false);
    message.success("Discount value and targets updated");
    forcePop();

    if (onSaved) {
      void Promise.resolve(onSaved()).catch(() => {
        message.error("Discount saved, but the details could not be refreshed");
      });
    }
  }, [
    discount,
    forcePop,
    message,
    mutation,
    onSaved,
    setDirty,
    values,
  ]);

  const errorMessage = formError ?? mutation.error?.message ?? null;

  return (
    <ModalLayout
      name="discount-value-targets-edit"
      header={
        <ModalHeader
          name="discount-value-targets-edit"
          title="Edit value, targets & requirements"
          onClose={pop}
          submitButtonProps={{
            children: "Save",
            loading: mutation.loading,
            disabled: !dirty,
            onClick: save,
          }}
        />
      }
      bodyClassName={styles.body}
    >
      <div className={styles.container}>
        {errorMessage ? (
          <Alert type="error" showIcon message={errorMessage} />
        ) : null}

        {isAmountOff ? (
          <Paper className={styles.section}>
            <PaperHeader title="Value" />
            <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <Typography.Text strong className={styles.fieldLabel}>
                Value type *
              </Typography.Text>
              <Select
                aria-label="Discount value type"
                data-testid="discount-value-type"
                value={values.valueType}
                options={[
                  {
                    value: DiscountValueType.Percentage,
                    label: "Percentage",
                  },
                  {
                    value: DiscountValueType.FixedAmount,
                    label: "Fixed amount",
                  },
                ]}
                onChange={(valueType) => updateValues({ valueType })}
                style={{ width: "100%" }}
              />
              <Typography.Text className={styles.fieldHelp}>
                PERCENTAGE or FIXED_AMOUNT.
              </Typography.Text>
            </div>

            <div className={styles.field}>
              <Typography.Text strong className={styles.fieldLabel}>
                {values.valueType === DiscountValueType.Percentage
                  ? "Percentage *"
                  : "Amount *"}
              </Typography.Text>
              {values.valueType === DiscountValueType.Percentage ? (
                <InputNumber
                  aria-label="Discount percentage"
                  data-testid="discount-percentage-input"
                  min={0.01}
                  max={100}
                  precision={2}
                  value={values.percentage}
                  suffix="%"
                  onChange={(percentage) => updateValues({ percentage })}
                  style={{ width: "100%" }}
                />
              ) : (
                <Input
                  aria-label="Discount fixed amount"
                  data-testid="discount-fixed-amount-input"
                  inputMode="decimal"
                  prefix={currencySymbol}
                  value={values.amount}
                  onChange={(event) =>
                    updateValues({ amount: event.target.value })
                  }
                />
              )}
              <Typography.Text className={styles.fieldHelp}>
                {values.valueType === DiscountValueType.Percentage
                  ? `Sent as percentageBps: ${Math.round(
                      (values.percentage ?? 0) * 100,
                    )}. Valid range is 1 to 10000.`
                  : "Sent as amountMinor; must be a positive amount."}
              </Typography.Text>
            </div>
            </div>

            <Checkbox
              className={styles.allocation}
              data-testid="discount-allocation-each-checkbox"
              checked={
                values.allocationMethod === DiscountAllocationMethod.Each
              }
              onChange={(event) =>
                updateValues({
                  allocationMethod: event.target.checked
                    ? DiscountAllocationMethod.Each
                    : DiscountAllocationMethod.Across,
                })
              }
            >
              <span className={styles.allocationCopy}>
                <Typography.Text>
                  Allocate to each eligible line
                </Typography.Text>
                <Typography.Text className={styles.fieldHelp}>
                  EACH when enabled; ACROSS when disabled.
                </Typography.Text>
              </span>
            </Checkbox>

            <div className={styles.field}>
              <Typography.Text strong className={styles.fieldLabel}>
                Maximum discount
              </Typography.Text>
              <Input
                aria-label="Maximum discount"
                data-testid="discount-maximum-input"
                inputMode="decimal"
                prefix={
                  values.maximumDiscount ? currencySymbol : undefined
                }
                placeholder="No limit"
                value={values.maximumDiscount}
                onChange={(event) =>
                  updateValues({ maximumDiscount: event.target.value })
                }
              />
              <Typography.Text className={styles.fieldHelp}>
                Optional maximumDiscountMinor; must be a positive amount.
              </Typography.Text>
            </div>
          </Paper>
        ) : null}

        {isFreeShipping ? (
          <Paper className={styles.section}>
            <PaperHeader title="Value" />
            <div className={styles.field}>
              <Typography.Text strong className={styles.fieldLabel}>
                Maximum shipping price
              </Typography.Text>
              <Input
                aria-label="Maximum shipping price"
                data-testid="discount-maximum-shipping-price-input"
                inputMode="decimal"
                prefix={
                  values.maximumShippingPrice
                    ? currencySymbol
                    : undefined
                }
                placeholder="No limit"
                value={values.maximumShippingPrice}
                onChange={(event) =>
                  updateValues({
                    maximumShippingPrice: event.target.value,
                  })
                }
              />
              <Typography.Text className={styles.fieldHelp}>
                Leave empty to apply to all eligible shipping rates.
              </Typography.Text>
            </div>
          </Paper>
        ) : null}

        {isBuyXGetY ? (
          <>
            <Paper className={styles.section}>
              <PaperHeader title="Customer buys" />
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <Typography.Text strong className={styles.fieldLabel}>
                    Requirement *
                  </Typography.Text>
                  <Select
                    aria-label="Buy requirement"
                    data-testid="discount-buy-requirement-type"
                    value={values.buyRequirementType}
                    options={[
                      {
                        value: DiscountRequirementType.Quantity,
                        label: "Minimum quantity",
                      },
                      {
                        value: DiscountRequirementType.Subtotal,
                        label: "Minimum subtotal",
                      },
                    ]}
                    onChange={(buyRequirementType) =>
                      updateValues({ buyRequirementType })
                    }
                    style={{ width: "100%" }}
                  />
                </div>
                <div className={styles.field}>
                  <Typography.Text strong className={styles.fieldLabel}>
                    {values.buyRequirementType ===
                    DiscountRequirementType.Quantity
                      ? "Required quantity *"
                      : "Required subtotal *"}
                  </Typography.Text>
                  {values.buyRequirementType ===
                  DiscountRequirementType.Quantity ? (
                    <InputNumber
                      aria-label="Required quantity"
                      data-testid="discount-required-quantity-input"
                      min={1}
                      precision={0}
                      value={values.requiredQuantity}
                      onChange={(requiredQuantity) =>
                        updateValues({ requiredQuantity })
                      }
                      style={{ width: "100%" }}
                    />
                  ) : (
                    <Input
                      aria-label="Required subtotal"
                      data-testid="discount-required-subtotal-input"
                      inputMode="decimal"
                      prefix={currencySymbol}
                      value={values.requiredSubtotal}
                      onChange={(event) =>
                        updateValues({
                          requiredSubtotal: event.target.value,
                        })
                      }
                    />
                  )}
                </div>
              </div>
            </Paper>

            <Paper className={styles.section}>
              <PaperHeader title="Customer gets" />
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <Typography.Text strong className={styles.fieldLabel}>
                    Benefit quantity *
                  </Typography.Text>
                  <InputNumber
                    aria-label="Benefit quantity"
                    data-testid="discount-benefit-quantity-input"
                    min={1}
                    precision={0}
                    value={values.benefitQuantity}
                    onChange={(benefitQuantity) =>
                      updateValues({ benefitQuantity })
                    }
                    style={{ width: "100%" }}
                  />
                </div>
                <div className={styles.field}>
                  <Typography.Text strong className={styles.fieldLabel}>
                    Benefit value *
                  </Typography.Text>
                  <Select
                    aria-label="Benefit value type"
                    data-testid="discount-benefit-value-type"
                    value={values.benefitValueType}
                    options={[
                      {
                        value: DiscountValueType.Free,
                        label: "Free",
                      },
                      {
                        value: DiscountValueType.Percentage,
                        label: "Percentage",
                      },
                      {
                        value: DiscountValueType.FixedAmount,
                        label: "Fixed amount",
                      },
                    ]}
                    onChange={(benefitValueType) =>
                      updateValues({ benefitValueType })
                    }
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              {values.benefitValueType !== DiscountValueType.Free ? (
                <div className={styles.fieldGrid}>
                  <div className={styles.field}>
                    <Typography.Text strong className={styles.fieldLabel}>
                      {values.benefitValueType ===
                      DiscountValueType.Percentage
                        ? "Benefit percentage *"
                        : "Benefit amount *"}
                    </Typography.Text>
                    {values.benefitValueType ===
                    DiscountValueType.Percentage ? (
                      <InputNumber
                        aria-label="Benefit percentage"
                        data-testid="discount-benefit-percentage-input"
                        min={0.01}
                        max={100}
                        precision={2}
                        suffix="%"
                        value={values.benefitPercentage}
                        onChange={(benefitPercentage) =>
                          updateValues({ benefitPercentage })
                        }
                        style={{ width: "100%" }}
                      />
                    ) : (
                      <Input
                        aria-label="Benefit amount"
                        data-testid="discount-benefit-amount-input"
                        inputMode="decimal"
                        prefix={currencySymbol}
                        value={values.benefitAmount}
                        onChange={(event) =>
                          updateValues({
                            benefitAmount: event.target.value,
                          })
                        }
                      />
                    )}
                  </div>
                  <div className={styles.field}>
                    <Typography.Text strong className={styles.fieldLabel}>
                      Uses per order
                    </Typography.Text>
                    <InputNumber
                      aria-label="Uses per order"
                      data-testid="discount-uses-per-order-input"
                      min={1}
                      precision={0}
                      placeholder="No limit"
                      value={values.usesPerOrderLimit}
                      onChange={(usesPerOrderLimit) =>
                        updateValues({ usesPerOrderLimit })
                      }
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.field}>
                  <Typography.Text strong className={styles.fieldLabel}>
                    Uses per order
                  </Typography.Text>
                  <InputNumber
                    aria-label="Uses per order"
                    data-testid="discount-uses-per-order-input"
                    min={1}
                    precision={0}
                    placeholder="No limit"
                    value={values.usesPerOrderLimit}
                    onChange={(usesPerOrderLimit) =>
                      updateValues({ usesPerOrderLimit })
                    }
                    style={{ width: "100%" }}
                  />
                </div>
              )}
            </Paper>
          </>
        ) : null}

        {discount.kind === DiscountKind.AmountOffProducts ? (
          <TargetSelectionEditor
            testIdPrefix="discount-benefit-target"
            title="Applies to"
            targetType={values.targetType}
            targets={values.targets}
            onChange={(targetType, targets) =>
              updateValues({ targetType, targets })
            }
          />
        ) : null}

        {isBuyXGetY ? (
          <>
            <TargetSelectionEditor
              testIdPrefix="discount-qualifier-target"
              title="Customer buys"
              targetType={values.qualifierTargetType}
              targets={values.qualifierTargets}
              onChange={(qualifierTargetType, qualifierTargets) =>
                updateValues({
                  qualifierTargetType,
                  qualifierTargets,
                })
              }
            />
            <TargetSelectionEditor
              testIdPrefix="discount-benefit-target"
              title="Customer gets"
              targetType={values.targetType}
              targets={values.targets}
              onChange={(targetType, targets) =>
                updateValues({ targetType, targets })
              }
            />
          </>
        ) : null}

        {discount.kind === DiscountKind.AmountOffOrder ||
        isFreeShipping ? (
          <Paper className={styles.section}>
            <PaperHeader title="Applies to" />
            <div
              className={cx(
                styles.targetOption,
                styles.targetOptionSelected,
              )}
            >
              <span className={styles.targetCopy}>
                <Typography.Text className={styles.targetTitle}>
                  {isFreeShipping
                    ? "Eligible shipping rates"
                    : "Entire order"}
                </Typography.Text>
                <Typography.Text className={styles.targetDescription}>
                  {isFreeShipping
                    ? "Free shipping applies to eligible delivery methods."
                    : "Order discounts cannot contain catalog target selections."}
                </Typography.Text>
              </span>
            </div>
          </Paper>
        ) : null}

        {!isBuyXGetY ? (
          <Paper className={styles.section}>
          <PaperHeader title="Minimum requirements" />
          <div className={styles.field}>
            <Typography.Text strong className={styles.fieldLabel}>
              Requirement
            </Typography.Text>
            <Select
              aria-label="Minimum requirement"
              data-testid="discount-minimum-requirement-type"
              value={values.requirementType ?? "NONE"}
              options={[
                { value: "NONE", label: "None" },
                {
                  value: DiscountRequirementType.Subtotal,
                  label: "Minimum subtotal",
                },
                {
                  value: DiscountRequirementType.Quantity,
                  label: "Minimum quantity",
                },
              ]}
              onChange={(requirementType) =>
                updateValues({
                  requirementType:
                    requirementType === "NONE"
                      ? null
                      : (requirementType as DiscountRequirementType),
                })
              }
              style={{ width: "100%" }}
            />
            <Typography.Text className={styles.fieldHelp}>
              None clears requirement; otherwise SUBTOTAL or QUANTITY.
            </Typography.Text>
          </div>

          {values.requirementType === DiscountRequirementType.Subtotal ? (
            <div className={styles.field}>
              <Typography.Text strong className={styles.fieldLabel}>
                Minimum subtotal *
              </Typography.Text>
              <Input
                aria-label="Minimum subtotal"
                data-testid="discount-minimum-subtotal-input"
                inputMode="decimal"
                prefix={currencySymbol}
                value={values.minimumSubtotal}
                onChange={(event) =>
                  updateValues({ minimumSubtotal: event.target.value })
                }
              />
              <Typography.Text className={styles.fieldHelp}>
                Sent as subtotalMinor; quantity is omitted.
              </Typography.Text>
            </div>
          ) : null}

          {values.requirementType === DiscountRequirementType.Quantity ? (
            <div className={styles.field}>
              <Typography.Text strong className={styles.fieldLabel}>
                Minimum quantity *
              </Typography.Text>
              <InputNumber
                aria-label="Minimum quantity"
                data-testid="discount-minimum-quantity-input"
                min={1}
                precision={0}
                value={values.minimumQuantity}
                onChange={(minimumQuantity) =>
                  updateValues({ minimumQuantity })
                }
                style={{ width: "100%" }}
              />
              <Typography.Text className={styles.fieldHelp}>
                Sent as quantity; subtotalMinor is omitted.
              </Typography.Text>
            </div>
          ) : null}
          </Paper>
        ) : null}
      </div>
    </ModalLayout>
  );
}
