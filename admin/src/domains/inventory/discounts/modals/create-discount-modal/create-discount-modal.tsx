"use client";

import { useCallback, useEffect } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, Input, Radio, Typography } from "antd";
import { createStyles } from "antd-style";
import { LuInfo as InfoOutlined } from "react-icons/lu";
import { DiscountKind, DiscountMethod } from "@/graphql/types";
import { ModalHeader, ModalLayout, useModalStackContext } from "@/layouts/modals";
import { useDefaultCurrency } from "@/domains/workspace/hooks";
import { Paper } from "@/ui-kit/paper";
import { useCreateDiscount } from "../../hooks";
import { buildDiscountCreateInput, mapDiscountUserErrorsToFormErrors } from "../../mappers";
import type { ICreateDiscountModalPayload } from "../../modals";
import { DiscountTypeSelector } from "../select-discount-type-modal";
import { createDiscountSchema, type CreateDiscountFormValues } from "./schema";

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    paddingBlock: 8,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 16,
  },
  sectionHeader: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  sectionHeaderCopy: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: token.colorText,
    lineHeight: 1.35,
  },
  sectionDescription: {
    fontSize: 13,
    color: token.colorTextTertiary,
    lineHeight: 1.35,
  },
  divider: {
    height: 1,
    background: token.colorBorderSecondary,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: token.colorText,
  },
  labelRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  hint: {
    fontSize: 11,
    color: token.colorTextSecondary,
  },
  methodGroup: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    "@media (max-width: 700px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  methodOption: {
    width: "100%",
    minHeight: 56,
    marginInlineEnd: 0,
    padding: "12px 14px",
    border: `1px solid ${token.colorBorder}`,
    borderRadius: 10,
    background: token.colorBgContainer,
    alignItems: "center",
    boxSizing: "border-box",
    transition: `border-color ${token.motionDurationMid}, background ${token.motionDurationMid}, box-shadow ${token.motionDurationMid}`,
    "&:hover": {
      borderColor: token.colorPrimaryBorderHover,
    },
    ".ant-radio + span": {
      minWidth: 0,
      flex: 1,
      paddingInlineStart: 12,
      paddingInlineEnd: 0,
    },
  },
  methodOptionSelected: {
    borderColor: token.colorPrimary,
    background: token.colorPrimaryBg,
    boxShadow: `inset 0 0 0 1px ${token.colorPrimary}`,
    "&:hover": {
      borderColor: token.colorPrimary,
    },
  },
  methodCopy: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  methodTitle: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: token.colorText,
    lineHeight: 1.35,
  },
  methodDescription: {
    display: "block",
    fontSize: 11,
    color: token.colorTextSecondary,
    lineHeight: 1.35,
  },
  error: {
    fontSize: 12,
    color: token.colorError,
  },
  note: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 14px",
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: 10,
    background: token.colorFillQuaternary,
  },
  noteIcon: {
    width: 28,
    height: 28,
    flex: "0 0 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    background: token.colorBgContainer,
    color: token.colorTextSecondary,
    fontSize: 15,
  },
  noteText: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
}));

const DEFAULT_VALUES: CreateDiscountFormValues = {
  kind: DiscountKind.AmountOffProducts,
  method: DiscountMethod.Automatic,
  title: "",
};

interface SectionHeaderProps {
  description: string;
  step: number;
  title: string;
}

function SectionHeader({ description, step, title }: SectionHeaderProps) {
  const { styles } = useStyles();

  return (
    <div className={styles.sectionHeader}>
      <div className={styles.sectionHeaderCopy}>
        <Typography.Text className={styles.sectionTitle}>
          {step}&nbsp; {title}
        </Typography.Text>
        <Typography.Text className={styles.sectionDescription}>{description}</Typography.Text>
      </div>
      <div className={styles.divider} />
    </div>
  );
}

export function CreateDiscountModal() {
  const { styles, cx } = useStyles();
  const { message } = App.useApp();
  const { payload, pop, forcePop, setDirty } = useModalStackContext();
  const { onCreated } = payload as ICreateDiscountModalPayload;
  const defaultCurrency = useDefaultCurrency();
  const { createDiscount, loading } = useCreateDiscount();

  const methods = useForm<CreateDiscountFormValues>({
    resolver: zodResolver(createDiscountSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    setValue,
    setError,
  } = methods;
  const method = useWatch({ control, name: "method" });
  const kind = useWatch({ control, name: "kind" });

  useEffect(() => {
    setDirty(isDirty);
  }, [isDirty, setDirty]);

  const onSubmit = useCallback(
    async (values: CreateDiscountFormValues) => {
      if (!defaultCurrency) return;

      const { discount, userErrors } = await createDiscount(
        buildDiscountCreateInput({
          currency: defaultCurrency,
          values,
        }),
      );

      if (userErrors.length > 0) {
        mapDiscountUserErrorsToFormErrors(userErrors).forEach((error) => {
          setError(error.field, { message: error.message });
        });
        message.error(userErrors[0].message);
        return;
      }

      if (discount) {
        message.success("Discount draft created successfully");
        await onCreated?.(discount);
        setDirty(false);
        forcePop();
      }
    },
    [createDiscount, defaultCurrency, forcePop, message, onCreated, setDirty, setError],
  );

  return (
    <FormProvider {...methods}>
      <ModalLayout
        name="create-discount"
        header={
          <ModalHeader
            name="create-discount"
            title="Create discount"
            onClose={pop}
            submitButtonProps={{
              children: "Create draft",
              disabled: !defaultCurrency,
              loading,
              onClick: handleSubmit(onSubmit),
            }}
          />
        }
      >
        <div className={styles.container}>
          {!defaultCurrency && (
            <Alert
              type="error"
              showIcon
              message="The store default currency is unavailable"
              description="Set a default currency in store settings before creating a discount."
            />
          )}

          <Paper className={styles.section}>
            <SectionHeader
              step={1}
              title="Discount type"
              description="Choose what this promotion applies to."
            />
            <DiscountTypeSelector
              selectedKind={kind}
              onSelect={(selectedKind) => {
                setValue("kind", selectedKind, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            />
            {errors.kind?.message && (
              <Typography.Text className={styles.error}>{errors.kind.message}</Typography.Text>
            )}
          </Paper>

          <Paper className={styles.section}>
            <SectionHeader
              step={2}
              title="Activation"
              description="Choose how customers receive this discount."
            />

            <div className={styles.field}>
              <Controller
                name="method"
                control={control}
                render={({ field }) => (
                  <Radio.Group
                    {...field}
                    className={styles.methodGroup}
                    data-testid="discount-method"
                  >
                    <Radio
                      value={DiscountMethod.Code}
                      data-testid="discount-method-code"
                      className={cx(
                        styles.methodOption,
                        method === DiscountMethod.Code && styles.methodOptionSelected,
                      )}
                    >
                      <span className={styles.methodCopy}>
                        <Typography.Text className={styles.methodTitle}>
                          Discount code
                        </Typography.Text>
                        <Typography.Text className={styles.methodDescription}>
                          Customers enter a code at checkout.
                        </Typography.Text>
                      </span>
                    </Radio>
                    <Radio
                      value={DiscountMethod.Automatic}
                      data-testid="discount-method-automatic"
                      className={cx(
                        styles.methodOption,
                        method === DiscountMethod.Automatic && styles.methodOptionSelected,
                      )}
                    >
                      <span className={styles.methodCopy}>
                        <Typography.Text className={styles.methodTitle}>
                          Automatic discount
                        </Typography.Text>
                        <Typography.Text className={styles.methodDescription}>
                          Applied automatically when conditions match.
                        </Typography.Text>
                      </span>
                    </Radio>
                  </Radio.Group>
                )}
              />
              {errors.method?.message && (
                <Typography.Text className={styles.error}>{errors.method.message}</Typography.Text>
              )}
            </div>

            {method === DiscountMethod.Automatic && (
              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <Typography.Text className={styles.label}>Title</Typography.Text>
                  <Typography.Text className={styles.hint}>
                    Required for automatic discounts
                  </Typography.Text>
                </div>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      size="middle"
                      data-testid="discount-create-title-input"
                      status={errors.title ? "error" : undefined}
                      placeholder="e.g. Summer sale"
                    />
                  )}
                />
                {errors.title?.message && (
                  <Typography.Text className={styles.error}>{errors.title.message}</Typography.Text>
                )}
              </div>
            )}
          </Paper>

          <div className={styles.note}>
            <span className={styles.noteIcon}>
              <InfoOutlined />
            </span>
            <Typography.Text className={styles.noteText}>
              Value and conditions are configured in the next step.
            </Typography.Text>
          </div>
        </div>
      </ModalLayout>
    </FormProvider>
  );
}
