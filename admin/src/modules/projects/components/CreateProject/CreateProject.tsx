import { StoresLayout } from '@modules/projects/components/Layout';
import { useState } from 'react';
import { Flex } from '@components/utility/Flex';
import {
  CreateProjectSteps,
  Steps,
} from '@modules/projects/components/CreateProject/Steps';
import { InformationStep } from '@modules/projects/components/CreateProject/InformationStep';
import { LocalizationStep } from '@modules/projects/components/CreateProject/LocalizationStep';
import { FinishStep } from '@modules/projects/components/CreateProject/FinishStep';
import { FormProvider, useForm } from 'react-hook-form';
import { routes } from '@modules/router/routes';
import {
  CreateProjectMutation,
  IProjectMutationCreateResponse,
} from '@modules/projects/graphql/createProject';
import { useMutation } from '@apollo/client';
import { ApiProjectMutationCreateArgs, ProjectStatus } from '@src/graphql';
import { message } from 'antd';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
import { allowedTimezones } from '@src/defs/localization/timezones';
import { notify } from '@components/feedback/notification';

interface ICreateProjectValues {
  country: string | null;
  currency: string | null;
  locales: string[];
  name: string;
}

const CreateProject = () => {
  const { formatMessage } = useIntl();
  const [projectApiKey, setProjectApiKey] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(
    CreateProjectSteps.Information,
  );

  const [createProject, { error }] = useMutation<
    IProjectMutationCreateResponse,
    ApiProjectMutationCreateArgs
  >(CreateProjectMutation);

  const methods = useForm({
    defaultValues: {
      country: null,
      currency: null,
      locales: [],
      name: '',
    } as ICreateProjectValues,
  });

  const onSubmit = methods.handleSubmit((values: ICreateProjectValues) => {
    createProject({
      onError() {
        notify.error(formatMessage({ id: t('projects.create.failed') }));
        setCurrentStep(CreateProjectSteps.Information);
      },
      onCompleted(data) {
        setProjectApiKey(data.projectMutation.create.slug);
      },
      variables: {
        input: {
          country: values.country!,
          currency: values.currency!,
          locales: values.locales,
          status: ProjectStatus.Active,
          name: values.name,
          timezone: allowedTimezones[0],
        },
      },
    });
  });

  return (
    <StoresLayout userMenu={false}>
      <Steps current={currentStep} />
      <Flex h="100%" direction="column" grow="1">
        <FormProvider {...methods}>
          {currentStep === CreateProjectSteps.Information && (
            <InformationStep
              nextDisabled={!!error}
              onNext={() => {
                setCurrentStep(CreateProjectSteps.Localization);
              }}
            />
          )}
          {currentStep === CreateProjectSteps.Localization && (
            <LocalizationStep
              onPrev={() => {
                setCurrentStep(CreateProjectSteps.Information);
              }}
              onNext={() => {
                onSubmit();
                setCurrentStep(CreateProjectSteps.Finish);
              }}
            />
          )}
          {currentStep === CreateProjectSteps.Finish && (
            <FinishStep
              ready={!!projectApiKey}
              onNext={() => {
                if (!projectApiKey) {
                  return;
                }
                location.replace(routes.store.getUrl(projectApiKey));
              }}
            />
          )}
        </FormProvider>
      </Flex>
    </StoresLayout>
  );
};

// react.lazy
// eslint-disable-next-line import/no-default-export
export default CreateProject;
