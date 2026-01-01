import { Helper } from '@components/forms/Helper';
import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { Navigation } from '@modules/projects/components/CreateProject/Navigation';
import { router } from '@modules/router/router';
import { routes } from '@modules/router/routes';
import { Input, Typography } from 'antd';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
import { Controller, useFormContext } from 'react-hook-form';

export interface IInformationStepProps {
  onNext?: () => void;
  nextDisabled?: boolean;
}

export const InformationStep = ({
  onNext,
  nextDisabled,
}: IInformationStepProps) => {
  const { formatMessage } = useIntl();
  const { trigger } = useFormContext();

  const onSubmit = async () => {
    if (await trigger('name')) {
      onNext?.();
    }
  };

  return (
    <>
      <Flex
        direction="column"
        align="center"
        grow="1"
        pt="10"
        data-testid="information-step-container"
      >
        <Box>
          <Typography.Title level={4} data-testid="step-title">
            {formatMessage({
              id: t('projects.information.title'),
            })}
          </Typography.Title>
        </Box>
        <Controller
          name="name"
          rules={{
            minLength: {
              value: 2,
              message: formatMessage({
                id: t('projects.information.name.minLength'),
              }),
            },
            required: formatMessage({
              id: t('projects.information.name.required'),
            }),
          }}
          render={({ field, fieldState }) => (
            <Box w="100%" mt="10">
              <Label required htmlFor="store-name-field">
                {formatMessage({
                  id: t('projects.information.name.label'),
                })}
              </Label>
              <Input
                value={field.value}
                onChange={field.onChange}
                status={fieldState.invalid ? 'error' : ''}
                size="large"
                type="text"
                id="store-name-field"
                placeholder={formatMessage({
                  id: t('projects.information.name.placeholder'),
                })}
                data-testid="name-field"
              />
              <Helper data-testid="name-field-error">
                {fieldState.error?.message}
              </Helper>
            </Box>
          )}
        />
      </Flex>
      <Navigation
        onPrev={() => {
          router.navigate(routes.stores.link);
        }}
        nextProps={{ onClick: onSubmit, disabled: nextDisabled }}
      />
    </>
  );
};
