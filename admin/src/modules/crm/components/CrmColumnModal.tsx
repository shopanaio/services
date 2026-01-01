import { css } from '@emotion/react';
import { Input, Modal } from 'antd';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { Flex } from '@components/utility/Flex';
import { ValidationAlert } from '@components/forms/ValidationAlert';
import { Label } from '@components/forms/Label';
import { Slug } from '@components/forms/slug/Slug';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { ICrmColumn } from '@src/entity/Order/Crm';
import { useCreateCrmColumn, useUpdateCrmColumn } from '@modules/crm/hooks/crm';
import { ApiCrmUpdateColumnInput } from '@src/graphql';

const s = {
  container: css`
    padding: var(--x2);
    box-sizing: border-box;
  `,
};

export type ICrmColumnFormValue = Omit<ICrmColumn, 'id'> & {
  id: ID | null;
};

interface ICrmColumnModalProps {
  open: boolean;
  onClose: () => void;
  entry: ICrmColumnFormValue | null;
}

export const CrmColumnModal = ({
  open,
  onClose,
  entry,
}: ICrmColumnModalProps) => {
  const methods = useForm({
    defaultValues: {} as ICrmColumnFormValue,
  });

  const { control, handleSubmit, formState, reset } = methods;
  const { dirtyFields, isDirty } = formState;

  const { createColumn } = useCreateCrmColumn();
  const { updateColumn } = useUpdateCrmColumn();

  useEffect(() => {
    if (entry) {
      reset({
        id: entry.id,
        title: entry.title || '',
        slug: entry.slug || '',
        sortIndex: entry.sortIndex || 0,
      });
    }
  }, [entry, reset]);

  const onOk = handleSubmit(async (data) => {
    if (!data.id) {
      await createColumn(
        {
          title: data.title,
          slug: data.slug,
          sortIndex: data.sortIndex,
        },
        {
          refetchQueries: getRefetchQueries(),
          onCompleted: () => {
            onClose();
          },
          onError: () => {
            notify.error('Failed to create order board');
          },
        },
      );

      return;
    }

    const payload = { id: data.id } as ApiCrmUpdateColumnInput;
    if (dirtyFields.title) {
      payload.title = data.title;
    }

    if (dirtyFields.slug) {
      payload.slug = data.slug;
    }

    await updateColumn(payload, {
      refetchQueries: getRefetchQueries(),
      onCompleted: () => {
        onClose();
      },
      onError: () => {
        notify.error('Failed to update order board');
      },
    });
  });

  return (
    <FormProvider {...methods}>
      <Modal
        open={open}
        width={600}
        title={entry ? 'Column' : 'Create column'}
        onOk={onOk}
        onCancel={onClose}
        transitionName="ant-fade"
        maskTransitionName="ant-fade"
        cancelButtonProps={{
          'data-testid': 'board-column-modal-cancel-button',
        }}
        okButtonProps={{
          disabled: !isDirty,
          'data-testid': 'board-column-modal-submit-button',
        }}
        okText="Save"
      >
        <div css={s.container}>
          <ValidationAlert errors={formState.errors} />
          <Controller
            name="title"
            control={control}
            render={({ field }) => {
              return (
                <Flex w="100%" direction="column">
                  <Label required>Name</Label>
                  <Input
                    data-testid="board-column-name-field"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Enter subject"
                  />
                </Flex>
              );
            }}
          />
          <Flex mt="4" pb="10">
            <Slug sync={!entry?.id} referenceName="title" control={control} />
          </Flex>
        </div>
      </Modal>
    </FormProvider>
  );
};
