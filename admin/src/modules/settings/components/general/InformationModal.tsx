import { css } from '@emotion/react';
import { Input, Modal } from 'antd';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { ApiUpdateProjectInput } from '@src/graphql';
import { useEffect, useRef } from 'react';
import { Flex } from '@components/utility/Flex';
import { ValidationAlert } from '@components/forms/ValidationAlert';
import { Label } from '@components/forms/Label';
import { IProject, IProjectInfo } from '@src/entity/Project/Project';
import { useUpdateProject } from '@modules/settings/hooks/useUpdateProject';

import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { notify } from '@components/feedback/notification';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

const s = {
  container: css`
    padding: var(--x2);
    box-sizing: border-box;
  `,
};

interface IStoreInformationModalProps {
  open: boolean;
  onClose: () => void;
  project: IProjectInfo;
  onSubmit: (data: IProjectInfo) => void;
}

const schema = yup.object().shape({
  name: yup
    .string()
    .required('Name is required')
    .min(3, "Name can't be shorter than 3 characters")
    .max(32, "Name can't be longer than 32 characters"),
  phoneNumber: yup.string().max(14),
  email: yup.string().email('Invalid email'),
});

export const StoreInformationModal = ({
  open,
  onClose,
  project,
}: IStoreInformationModalProps) => {
  const { formatMessage } = useIntl();
  const formRef = useRef<HTMLFormElement>(null);
  const methods = useForm<Pick<IProject, 'id' | 'name'>>({
    defaultValues: {} as IProjectInfo,
    resolver: yupResolver(schema),
  });

  const { control, handleSubmit, formState, reset } = methods;
  const { dirtyFields, isDirty } = formState;

  const { loading, updateProject } = useUpdateProject();

  useEffect(() => {
    reset({
      name: project.name || '',
      // phoneNumber: '',
      // email: '',
    });
  }, [project, reset]);

  const onOk = handleSubmit(async (data) => {
    const payload = { id: data.id } as ApiUpdateProjectInput;

    if (dirtyFields.name) {
      payload.name = data.name;
    }

    // if (dirtyFields.phoneNumber) {
    //   payload.phoneNumber = data.phoneNumber;
    // }

    // if (dirtyFields.email) {
    //   payload.email = data.email;
    // }

    try {
      await updateProject(payload);
      notify.success(formatMessage({ id: t('settings.information.updated') }));
      onClose();
    } catch {
      notify.error(
        formatMessage({ id: t('settings.information.updateFailed') }),
      );
    }
  });

  return (
    <FormProvider {...methods}>
      <Modal
        open={open}
        width={600}
        title={formatMessage({ id: t('settings.information.title') })}
        onOk={() => {
          formRef.current?.requestSubmit();
        }}
        onCancel={onClose}
        cancelButtonProps={{
          'data-testid': 'modal-cancel-button',
        }}
        okButtonProps={{
          loading,
          disabled: !isDirty,
          'data-testid': 'modal-submit-button',
        }}
        okText={formatMessage({ id: t('common.save') })}
      >
        <form css={s.container} onSubmit={onOk} ref={formRef}>
          <ValidationAlert
            errors={formState.errors}
            css={css`
              margin-bottom: var(--x4);
            `}
          />
          <Controller
            control={control}
            name="name"
            render={({ field }) => (
              <Flex w="100%" direction="column">
                <Label required>{formatMessage({ id: t('common.name') })}</Label>
                <Input
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('customers.information.firstName.placeholder') })}
                  data-testid="name-input"
                  count={{ max: 32, show: true }}
                />
              </Flex>
            )}
          />
          {/* <Controller
            control={control}
            name="phoneNumber"
            render={({ field }) => {
              return (
                <Flex mt="4" direction="column">
                  <Label>Store phone number</Label>
                  <Input
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Enter phone number"
                    data-testid="phone-number-input"
                  />
                </Flex>
              );
            }}
          />
          <Controller
            control={control}
            name="email"
            render={({ field }) => {
              return (
                <Flex mt="4" direction="column">
                  <Label>Store email</Label>
                  <Input
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Enter email"
                    data-testid="email-input"
                  />
                </Flex>
              );
            }}
          /> */}
        </form>
      </Modal>
    </FormProvider>
  );
};
