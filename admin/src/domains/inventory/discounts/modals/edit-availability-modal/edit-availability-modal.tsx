"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, App, Checkbox, Flex, Input, InputNumber, Typography } from "antd";
import { LuInfo } from "react-icons/lu";
import { DiscountClass, DiscountMethod } from "@/graphql/types";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useUpdateDiscount } from "../../hooks";
import {
  buildDiscountAvailabilityUpdateInput,
  createDiscountAvailabilityFormValues,
  validateDiscountAvailabilityForm,
  type DiscountAvailabilityFormValues,
} from "../../mappers";
import type { IDiscountAvailabilityEditModalPayload } from "../../modals";
import { useEditAvailabilityModalStyles } from "./edit-availability-modal.styles";

const COMBINATIONS = [
  {
    value: DiscountClass.Product,
    title: "Product discounts",
    description: "Allow combining with other product-level discounts.",
  },
  {
    value: DiscountClass.Order,
    title: "Order discounts",
    description: "Allow combining with order-level discounts.",
  },
  {
    value: DiscountClass.Shipping,
    title: "Shipping discounts",
    description: "Allow combining with shipping discounts.",
  },
] as const;

const serializeValues = (values: DiscountAvailabilityFormValues) =>
  JSON.stringify({
    ...values,
    combinesWith: [...values.combinesWith].sort(),
  });

export function EditAvailabilityModal() {
  const { styles } = useEditAvailabilityModalStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const { discount, onSaved } = payload as IDiscountAvailabilityEditModalPayload;
  const mutation = useUpdateDiscount();
  const [values, setValues] = useState(() => createDiscountAvailabilityFormValues(discount));
  const [initialSnapshot] = useState(() =>
    serializeValues(createDiscountAvailabilityFormValues(discount)),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const dirty = serializeValues(values) !== initialSnapshot;
  const enabledCombinations = values.combinesWith.length;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
  const isCodeDiscount = discount.method === DiscountMethod.Code;

  useEffect(() => {
    setDirty(dirty);
  }, [dirty, setDirty]);

  const updateValues = useCallback((changes: Partial<DiscountAvailabilityFormValues>) => {
    setValues((current) => ({ ...current, ...changes }));
    setFormError(null);
  }, []);

  const toggleCombination = useCallback(
    (discountClass: DiscountClass, enabled: boolean) => {
      updateValues({
        combinesWith: enabled
          ? [...new Set([...values.combinesWith, discountClass])]
          : values.combinesWith.filter((item) => item !== discountClass),
      });
    },
    [updateValues, values.combinesWith],
  );

  const save = useCallback(async () => {
    const validationErrors = validateDiscountAvailabilityForm(discount, values);
    if (validationErrors.length > 0) {
      setFormError(validationErrors.join(" "));
      return;
    }

    const result = await mutation.updateDiscount({
      discountId: discount.id,
      expectedRevision: discount.revision,
      operations: buildDiscountAvailabilityUpdateInput(discount, values),
    });

    if (!result.discount || result.errors.length > 0) {
      setFormError(
        result.errors.map((error) => error.message).join(" ") || "Unable to update availability.",
      );
      return;
    }

    setDirty(false);
    message.success("Availability, limits and combinations updated");
    forcePop();
    if (onSaved) {
      void Promise.resolve(onSaved()).catch(() => {
        message.error("Discount saved, but the details could not be refreshed");
      });
    }
  }, [discount, forcePop, message, mutation, onSaved, setDirty, values]);

  const errorMessage = formError ?? mutation.error?.message ?? null;

  return (
    <ModalLayout
      name="discount-availability-edit"
      header={
        <ModalHeader
          name="discount-availability-edit"
          title="Edit availability, limits & combinations"
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
        {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}

        <Paper className={styles.section}>
          <PaperHeader
            title="Purchase eligibility"
            actions={<Typography.Text type="secondary">At least one required</Typography.Text>}
          />
          <div className={styles.optionList}>
            <Checkbox
              className={styles.option}
              checked={values.appliesOnOneTimePurchase}
              data-testid="discount-purchase-one-time"
              onChange={(event) =>
                updateValues({
                  appliesOnOneTimePurchase: event.target.checked,
                })
              }
            >
              <span className={styles.optionCopy}>
                <Typography.Text>One-time purchase</Typography.Text>
                <Typography.Text className={styles.optionHelp}>
                  appliesOnOneTimePurchase: {String(values.appliesOnOneTimePurchase)}
                </Typography.Text>
              </span>
            </Checkbox>
            <Checkbox
              className={styles.option}
              checked={values.appliesOnSubscription}
              data-testid="discount-purchase-subscription"
              onChange={(event) =>
                updateValues({
                  appliesOnSubscription: event.target.checked,
                })
              }
            >
              <span className={styles.optionCopy}>
                <Typography.Text>Subscription</Typography.Text>
                <Typography.Text className={styles.optionHelp}>
                  appliesOnSubscription: {String(values.appliesOnSubscription)}
                </Typography.Text>
              </span>
            </Checkbox>
          </div>
        </Paper>

        <Paper className={styles.section}>
          <PaperHeader title="Usage limits" />
          <div className={styles.field}>
            <Typography.Text strong className={styles.fieldLabel}>
              Total usage limit
            </Typography.Text>
            <InputNumber
              aria-label="Total usage limit"
              data-testid="discount-total-usage-limit"
              min={1}
              precision={0}
              placeholder="No limit"
              value={values.usageLimit}
              onChange={(usageLimit) => updateValues({ usageLimit })}
              style={{ width: "100%" }}
            />
            <Typography.Text className={styles.fieldHelp}>
              Optional usageLimit; must not be below reserved and consumed usage.
            </Typography.Text>
          </div>
          <Checkbox
            className={styles.option}
            checked={values.appliesOncePerCustomer}
            disabled={!isCodeDiscount}
            data-testid="discount-once-per-customer"
            onChange={(event) =>
              updateValues({
                appliesOncePerCustomer: event.target.checked,
              })
            }
          >
            <span className={styles.optionCopy}>
              <Typography.Text>Limit to one use per customer</Typography.Text>
              <Typography.Text className={styles.optionHelp}>
                appliesOncePerCustomer. Available for CODE discounts only.
              </Typography.Text>
            </span>
          </Checkbox>
        </Paper>

        <Paper className={styles.section}>
          <PaperHeader
            title="Combinations"
            actions={
              <Typography.Text type="secondary">
                {enabledCombinations} of {COMBINATIONS.length} enabled
              </Typography.Text>
            }
          />
          <div className={styles.optionList}>
            {COMBINATIONS.map((option) => (
              <Checkbox
                key={option.value}
                className={styles.option}
                checked={values.combinesWith.includes(option.value)}
                data-testid={`discount-combination-${option.value.toLowerCase()}`}
                onChange={(event) => toggleCombination(option.value, event.target.checked)}
              >
                <span className={styles.optionCopy}>
                  <Typography.Text>{option.title}</Typography.Text>
                  <Typography.Text className={styles.optionHelp}>
                    {option.description}
                  </Typography.Text>
                </span>
              </Checkbox>
            ))}
          </div>
          <Flex align="center" gap={10} className={styles.info}>
            <LuInfo />
            <Typography.Text type="secondary">
              Checked rows are submitted as the combinesWith DiscountClass array.
            </Typography.Text>
          </Flex>
        </Paper>

        <Paper className={styles.section}>
          <PaperHeader
            title="Active dates"
            actions={<Typography.Text type="secondary">{timezone}</Typography.Text>}
          />
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <Typography.Text strong className={styles.fieldLabel}>
                Starts at *
              </Typography.Text>
              <Input
                aria-label="Discount starts at"
                data-testid="discount-starts-at"
                type="datetime-local"
                value={values.startsAt}
                onChange={(event) => updateValues({ startsAt: event.target.value })}
              />
              <Typography.Text className={styles.fieldHelp}>Required DateTime.</Typography.Text>
            </div>
            <div className={styles.field}>
              <Typography.Text strong className={styles.fieldLabel}>
                Ends at
              </Typography.Text>
              <Input
                aria-label="Discount ends at"
                data-testid="discount-ends-at"
                type="datetime-local"
                value={values.endsAt}
                onChange={(event) => updateValues({ endsAt: event.target.value })}
              />
              <Typography.Text className={styles.fieldHelp}>
                Optional DateTime; must be after startsAt.
              </Typography.Text>
            </div>
          </div>
        </Paper>
      </div>
    </ModalLayout>
  );
}
