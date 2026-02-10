"use client";

import { useState, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { Button, Steps, App } from "antd";
import {
  ShopOutlined,
  GlobalOutlined,
  RocketOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import {
  useModalStackContext,
  ModalLayout,
  ModalHeader,
} from "@/layouts/modals";
import { Paper } from "@/ui-kit/paper";
import type { ICreateStoreModalPayload } from "../../modals";
import { useStyles } from "./create-store-modal.styles";
import { CreateStoreSteps, type ICreateStoreFormValues } from "./types";
import { InformationStep, LocalizationStep, FinishStep } from "./components";

const STEP_ITEMS = [
  { title: "Information", icon: <ShopOutlined /> },
  { title: "Localization", icon: <GlobalOutlined /> },
  { title: "Finish", icon: <RocketOutlined /> },
];

const DEFAULT_VALUES: ICreateStoreFormValues = {
  name: "",
  country: null,
  currency: null,
  locales: [],
};

export const CreateStoreModal = () => {
  const { styles } = useStyles();
  const { message } = App.useApp();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as ICreateStoreModalPayload;

  const [currentStep, setCurrentStep] = useState(CreateStoreSteps.Information);
  const [storeReady, setStoreReady] = useState(false);

  const methods = useForm<ICreateStoreFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const handleSubmit = methods.handleSubmit(async () => {
    setCurrentStep(CreateStoreSteps.Finish);
    setTimeout(() => setStoreReady(true), 500);
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

  const handleNext = useCallback(async () => {
    if (currentStep === CreateStoreSteps.Information) {
      const isValid = await methods.trigger("name");
      if (isValid) {
        setCurrentStep(CreateStoreSteps.Localization);
      }
    } else if (currentStep === CreateStoreSteps.Localization) {
      const isValid = await methods.trigger(["country", "currency", "locales"]);
      if (isValid) {
        handleSubmit();
      }
    }
  }, [currentStep, methods, handleSubmit]);

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => prev - 1);
  }, []);

  const canProceed = currentStep !== CreateStoreSteps.Finish;
  const canGoBack = currentStep > CreateStoreSteps.Information;

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
          <Steps current={currentStep} items={STEP_ITEMS} size="small" />
        </div>

        <FormProvider {...methods}>
          <div className={styles.content}>
            {currentStep === CreateStoreSteps.Information && <InformationStep />}
            {currentStep === CreateStoreSteps.Localization && <LocalizationStep />}
            {currentStep === CreateStoreSteps.Finish && (
              <FinishStep ready={storeReady} onComplete={handleComplete} />
            )}
          </div>

          {canProceed && (
            <div className={styles.navigation}>
              <div>
                {canGoBack && (
                  <Button icon={<ArrowLeftOutlined />} onClick={handlePrev}>
                    Back
                  </Button>
                )}
              </div>
              <Button type="primary" onClick={handleNext}>
                {currentStep === CreateStoreSteps.Localization
                  ? "Create Store"
                  : "Next"}
              </Button>
            </div>
          )}
        </FormProvider>
      </Paper>
    </ModalLayout>
  );
};
