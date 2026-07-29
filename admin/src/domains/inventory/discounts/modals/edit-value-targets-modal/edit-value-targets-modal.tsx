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
  const selectedIds = values.targets.map((target) => target.id);
  const targetCopy = getTargetCopy(values.targetType);
  const currencySymbol = getCurrencySymbol(discount.currency);

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

  const handlePickerConfirm = useCallback(
    (entities: IPickableEntity[], ids: string[]) => {
      setValues((current) => ({
        ...current,
        targets: mergePickerSelection(current.targets, entities, ids),
      }));
      setFormError(null);
    },
    [],
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
    if (values.targetType === DiscountTargetType.Products) {
      productPicker.openPicker();
    } else if (values.targetType === DiscountTargetType.Variants) {
      variantPicker.openPicker();
    } else if (values.targetType === DiscountTargetType.Categories) {
      categoryPicker.openPicker();
    }
  }, [
    categoryPicker,
    productPicker,
    values.targetType,
    variantPicker,
  ]);

  const save = useCallback(async () => {
    const validationErrors = validateDiscountValueTargetsForm(values);
    if (validationErrors.length > 0) {
      setFormError(validationErrors.join(" "));
      return;
    }

    const result = await mutation.updateDiscount({
      discountId: discount.id,
      expectedRevision: discount.revision,
      operations: buildDiscountValueTargetsUpdateInput(values),
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

        <Paper className={styles.section}>
          <PaperHeader title="Value" />
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <Typography.Text strong className={styles.fieldLabel}>
                Value type *
              </Typography.Text>
              <Select
                aria-label="Discount value type"
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
              <Typography.Text>Allocate to each eligible line</Typography.Text>
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
              inputMode="decimal"
              prefix={values.maximumDiscount ? currencySymbol : undefined}
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

        <Paper className={styles.section}>
          <PaperHeader title="Applies to" />
          <Radio.Group
            className={styles.targetGroup}
            value={values.targetType}
            onChange={(event) =>
              updateValues({
                targetType: event.target.value,
                targets: [],
              })
            }
          >
            {TARGET_OPTIONS.map((option) => (
              <Radio
                key={option.value}
                value={option.value}
                className={cx(
                  styles.targetOption,
                  values.targetType === option.value &&
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
          <Paper className={styles.section}>
            <PaperHeader
              title={`Selected ${targetCopy.plural}`}
              actions={
                <Typography.Text type="secondary">
                  {values.targets.length} selected
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
                    values.targets.length === 0
                      ? ""
                      : `${values.targets.length} ${targetCopy.plural} selected`
                  }
                  placeholder={`No ${targetCopy.plural} selected`}
                />
                <Button icon={<LuListPlus />} onClick={openPicker}>
                  Select
                </Button>
              </Flex>
              <Typography.Text className={styles.fieldHelp}>
                Produces targetIds for the {values.targetType} selection; at
                least one ID is required.
              </Typography.Text>
            </div>
            {values.targets.length > 0 ? (
              <div className={styles.selectedTags}>
                {values.targets.map((target) => (
                  <Tag
                    key={target.id}
                    closable
                    className={styles.selectedTag}
                    onClose={() =>
                      updateValues({
                        targets: values.targets.filter(
                          (item) => item.id !== target.id,
                        ),
                      })
                    }
                  >
                    {target.title}
                  </Tag>
                ))}
              </div>
            ) : null}
          </Paper>
        ) : null}

        <Paper className={styles.section}>
          <PaperHeader title="Minimum requirements" />
          <div className={styles.field}>
            <Typography.Text strong className={styles.fieldLabel}>
              Requirement
            </Typography.Text>
            <Select
              aria-label="Minimum requirement"
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
      </div>
    </ModalLayout>
  );
}
