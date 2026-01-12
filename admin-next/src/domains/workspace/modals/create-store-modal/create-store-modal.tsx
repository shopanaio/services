"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useForm, Controller, FormProvider, useFormContext } from "react-hook-form";
import {
  Typography,
  Button,
  Input,
  Select,
  Steps,
  Progress,
  Tag,
  message,
} from "antd";
import type { CustomTagProps } from "rc-select/lib/BaseSelect";
import type { BaseSelectRef } from "rc-select";
import {
  ShopOutlined,
  GlobalOutlined,
  RocketOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { createStyles } from "antd-style";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import type { ICreateStoreModalPayload } from "../../modals";
import {
  shopCountries,
  allowedCountries,
  currencies,
  allowedCurrencies,
  shopLocales,
  allowedLocales,
} from "@/defs/localization";
import cartImg from "@/assets/shop-cart.png";

// ============================================================================
// Types
// ============================================================================

enum CreateStoreSteps {
  Information = 0,
  Localization = 1,
  Finish = 2,
}

interface CreateStoreFormValues {
  name: string;
  country: string | null;
  currency: string | null;
  locales: string[];
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    padding: token.paddingLG,
    background: token.colorBgLayout,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
  },
  stepsContainer: {
    padding: `${token.paddingMD}px ${token.paddingLG}px`,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: token.paddingLG,
    overflowY: "auto",
  },
  formContainer: {
    width: "100%",
    maxWidth: 480,
  },
  title: {
    textAlign: "center",
    marginBottom: token.marginLG,
  },
  formItem: {
    marginBottom: token.marginLG,
  },
  label: {
    display: "block",
    marginBottom: token.marginXS,
    fontWeight: 500,
    fontSize: token.fontSizeSM,
  },
  required: {
    color: token.colorError,
    marginLeft: 2,
  },
  helper: {
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    marginTop: token.marginXXS,
  },
  error: {
    color: token.colorError,
    fontSize: token.fontSizeSM,
    marginTop: token.marginXXS,
  },
  navigation: {
    flexShrink: 0,
    display: "flex",
    justifyContent: "space-between",
    padding: token.paddingMD,
    borderTop: `1px solid ${token.colorBorderSecondary}`,
  },
  finishContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: token.paddingXL,
  },
  finishTitle: {
    marginBottom: token.marginSM,
  },
  finishSubtitle: {
    color: token.colorTextSecondary,
    marginBottom: token.marginXL,
  },
  progressContainer: {
    marginTop: token.marginLG,
  },
  localeTag: {
    height: 32,
    marginRight: 3,
    display: "flex",
    alignItems: "center",
  },
  progressImageContainer: {
    marginLeft: 21,
    marginTop: 5,
    borderRadius: "100%",
    overflow: "hidden",
    width: 160,
  },
  progressImage: {
    width: "100%",
    height: "100%",
  },
}));

// ============================================================================
// Hook for simulating store creation progress
// ============================================================================

function useStoreProcessing(ready: boolean) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!ready) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [ready]);

  return Math.min(progress, 100);
}

// ============================================================================
// Step Components
// ============================================================================

interface InformationStepProps {
  onNext: () => void;
}

function InformationStep({ onNext }: InformationStepProps) {
  const { styles } = useStyles();
  const {
    control,
    formState: { errors },
  } = useFormContext<CreateStoreFormValues>();

  return (
    <div className={styles.formContainer}>
      <Typography.Title level={4} className={styles.title}>
        Name your store
      </Typography.Title>

      <div className={styles.formItem}>
        <label className={styles.label}>
          Store Name
          <span className={styles.required}>*</span>
        </label>
        <Controller
          name="name"
          control={control}
          rules={{
            required: "Store name is required",
            minLength: {
              value: 2,
              message: "Store name must be at least 2 characters",
            },
          }}
          render={({ field }) => (
            <Input
              {...field}
              size="large"
              placeholder="Enter your store name"
              status={errors.name ? "error" : undefined}
            />
          )}
        />
        {errors.name && (
          <div className={styles.error}>{errors.name.message}</div>
        )}
        <div className={styles.helper}>
          This will be displayed to your customers
        </div>
      </div>
    </div>
  );
}

interface LocalizationStepProps {
  onNext: () => void;
  onPrev: () => void;
}

function LocalizationStep({ onNext, onPrev }: LocalizationStepProps) {
  const { styles } = useStyles();
  const selectRef = useRef<BaseSelectRef>(null);
  const {
    control,
    getValues,
    formState: { errors },
  } = useFormContext<CreateStoreFormValues>();

  const handleChange = useCallback(() => {
    selectRef.current?.blur();
  }, []);

  const tagRender = (props: CustomTagProps) => {
    const selectedItems = getValues("locales") || [];
    const isFirst = selectedItems[0] === props.value;

    return (
      <Tag
        {...props}
        bordered
        color={isFirst ? "blue" : undefined}
        className={styles.localeTag}
      >
        <Typography.Text strong={isFirst}>{props.label}</Typography.Text>
      </Tag>
    );
  };

  const countryOptions = shopCountries
    .filter((c) => allowedCountries.includes(c.value))
    .map((c) => ({ value: c.value, label: c.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const currencyOptions = currencies
    .filter((c) => allowedCurrencies.includes(c.value))
    .map((c) => ({ value: c.value, label: c.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const localeOptions = shopLocales
    .filter((l) => allowedLocales.includes(l.value))
    .map((l) => ({ value: l.value, label: l.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className={styles.formContainer}>
      <Typography.Title level={4} className={styles.title}>
        Configure localization
      </Typography.Title>

      <div className={styles.formItem}>
        <label className={styles.label}>
          Country
          <span className={styles.required}>*</span>
        </label>
        <Controller
          name="country"
          control={control}
          rules={{ required: "Country is required" }}
          render={({ field }) => (
            <Select
              {...field}
              size="large"
              showSearch
              style={{ width: "100%" }}
              placeholder="Select country"
              options={countryOptions}
              status={errors.country ? "error" : undefined}
            />
          )}
        />
        {errors.country && (
          <div className={styles.error}>{errors.country.message}</div>
        )}
      </div>

      <div className={styles.formItem}>
        <label className={styles.label}>
          Languages
          <span className={styles.required}>*</span>
        </label>
        <Controller
          name="locales"
          control={control}
          rules={{ required: "At least one language is required" }}
          render={({ field }) => (
            <Select
              {...field}
              ref={selectRef}
              mode="multiple"
              size="large"
              showSearch
              style={{ width: "100%" }}
              placeholder="Select languages"
              options={localeOptions}
              status={errors.locales ? "error" : undefined}
              tagRender={tagRender}
              onChange={(value) => {
                handleChange();
                field.onChange(value);
              }}
            />
          )}
        />
        {errors.locales && (
          <div className={styles.error}>{errors.locales.message}</div>
        )}
        <div className={styles.helper}>
          First language will be the default. Drag to reorder.
        </div>
      </div>

      <div className={styles.formItem}>
        <label className={styles.label}>
          Currency
          <span className={styles.required}>*</span>
        </label>
        <Controller
          name="currency"
          control={control}
          rules={{ required: "Currency is required" }}
          render={({ field }) => (
            <Select
              {...field}
              size="large"
              showSearch
              style={{ width: "100%" }}
              placeholder="Select currency"
              options={currencyOptions}
              status={errors.currency ? "error" : undefined}
            />
          )}
        />
        {errors.currency && (
          <div className={styles.error}>{errors.currency.message}</div>
        )}
      </div>
    </div>
  );
}

interface FinishStepProps {
  ready: boolean;
  onComplete: () => void;
}

function FinishStep({ ready, onComplete }: FinishStepProps) {
  const { styles } = useStyles();
  const progress = useStoreProcessing(ready);

  useEffect(() => {
    if (progress >= 100) {
      const timeout = setTimeout(onComplete, 500);
      return () => clearTimeout(timeout);
    }
  }, [progress, onComplete]);

  return (
    <div className={styles.finishContainer}>
      <Typography.Title level={4} className={styles.finishTitle}>
        Creating your store... {Math.round(progress)}%
      </Typography.Title>
      <Typography.Text className={styles.finishSubtitle}>
        Please wait while we set up your store
      </Typography.Text>
      <div className={styles.progressContainer}>
        <Progress
          format={() => (
            <div className={styles.progressImageContainer}>
              <img
                src={cartImg.src}
                alt=""
                width={100}
                height={100}
                className={styles.progressImage}
              />
            </div>
          )}
          type="circle"
          percent={progress}
          size={202}
          strokeWidth={5}
          strokeLinecap="butt"
          strokeColor={{
            "0%": "#1890ff",
            "50%": "#722ed1",
            "100%": "#1890ff",
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export const CreateStoreModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICreateStoreModalPayload;

  const [currentStep, setCurrentStep] = useState(CreateStoreSteps.Information);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storeReady, setStoreReady] = useState(false);

  const methods = useForm<CreateStoreFormValues>({
    defaultValues: {
      name: "",
      country: null,
      currency: null,
      locales: [],
    },
  });

  const handleSubmit = methods.handleSubmit(async (values) => {
    setIsSubmitting(true);
    setCurrentStep(CreateStoreSteps.Finish);

    // Simulate API call
    setTimeout(() => {
      setStoreReady(true);
    }, 500);
  });

  const handleComplete = useCallback(() => {
    const values = methods.getValues();
    typedPayload.onCreate?.({
      name: values.name,
      country: values.country!,
      currency: values.currency!,
      locales: values.locales,
    });
    message.success(`Store "${values.name}" created successfully`);
    pop();
  }, [methods, typedPayload, pop]);

  const stepItems = [
    {
      title: "Information",
      icon: <ShopOutlined />,
    },
    {
      title: "Localization",
      icon: <GlobalOutlined />,
    },
    {
      title: "Finish",
      icon: <RocketOutlined />,
    },
  ];

  const canProceed = currentStep !== CreateStoreSteps.Finish;

  return (
    <ModalLayout
      name="create-store"
      header={
        <ModalHeader
          name="create-store"
          title="Create New Store"
          onClose={pop}
        />
      }
      bodyClassName={styles.container}
    >
      <Paper className={styles.card}>
        <div className={styles.stepsContainer}>
          <Steps
            current={currentStep}
            items={stepItems}
            size="small"
          />
        </div>

        <FormProvider {...methods}>
          <div className={styles.content}>
            {currentStep === CreateStoreSteps.Information && (
              <InformationStep
                onNext={() => setCurrentStep(CreateStoreSteps.Localization)}
              />
            )}
            {currentStep === CreateStoreSteps.Localization && (
              <LocalizationStep
                onPrev={() => setCurrentStep(CreateStoreSteps.Information)}
                onNext={() => handleSubmit()}
              />
            )}
            {currentStep === CreateStoreSteps.Finish && (
              <FinishStep ready={storeReady} onComplete={handleComplete} />
            )}
          </div>

          {canProceed && (
            <div className={styles.navigation}>
              <div>
                {currentStep > CreateStoreSteps.Information && (
                  <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => setCurrentStep((prev) => prev - 1)}
                  >
                    Back
                  </Button>
                )}
              </div>
              <Button
                type="primary"
                onClick={() => {
                  if (currentStep === CreateStoreSteps.Information) {
                    const isValid = methods.trigger("name");
                    isValid.then((valid) => {
                      if (valid) {
                        setCurrentStep(CreateStoreSteps.Localization);
                      }
                    });
                  } else if (currentStep === CreateStoreSteps.Localization) {
                    const isValid = methods.trigger(["country", "currency", "locales"]);
                    isValid.then((valid) => {
                      if (valid) {
                        handleSubmit();
                      }
                    });
                  }
                }}
              >
                {currentStep === CreateStoreSteps.Localization ? "Create Store" : "Next"}
              </Button>
            </div>
          )}
        </FormProvider>
      </Paper>
    </ModalLayout>
  );
};
