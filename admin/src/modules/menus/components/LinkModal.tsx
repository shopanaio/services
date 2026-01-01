import { ValidationAlert } from '@components/forms/ValidationAlert';
import { Button, Input, Modal, Select, Typography } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { css } from '@emotion/react';
import { Flex } from '@components/utility/Flex';
import { useEffect, useState } from 'react';
import { Label } from '@components/forms/Label';
import { ApiUpdateLinkInput, MenuNodeType } from '@src/graphql';
import { ILinkFormValue } from '@modules/menus/defs';
import { ProductSelect } from '@modules/products/components/ProductSelect';
import { CategorySelect } from '@modules/categories/components/CategorySelect';
import { PageSelect } from '@modules/pages/components/PageSelect';
import { MdClose } from 'react-icons/md';
import { useCreateLink, useUpdateLink } from '@modules/menus/hooks/link';
import { notify } from '@components/feedback/notification';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

const linkLabelIdMapping: Record<string, string> = {
  [MenuNodeType.Product]: t('menus.linkModal.type.product'),
  [MenuNodeType.Category]: t('menus.linkModal.type.category'),
  [MenuNodeType.Page]: t('menus.linkModal.type.page'),
  [MenuNodeType.Menu]: t('menus.linkModal.type.menu'),
  [MenuNodeType.Link]: t('menus.linkModal.type.url'),
};

const entrySelectMapping: any = {
  [MenuNodeType.Product]: ProductSelect,
  [MenuNodeType.Category]: CategorySelect,
  [MenuNodeType.Page]: PageSelect,
};

interface ILinkModalProps {
  open: boolean;
  onClose: () => void;
  link: ILinkFormValue | null;
  refetch: () => Promise<void>;
}

export const LinkModal = ({
  open,
  onClose,
  link,
  refetch,
}: ILinkModalProps) => {
  const [loading, setLoading] = useState(false);
  const { formatMessage } = useIntl();
  const methods = useForm({
    defaultValues: {} as ILinkFormValue,
    // resolver: yupResolver(getAttributeModalSchema(locales)) as any,
  });

  const { control, handleSubmit, formState, reset, watch, setValue } = methods;
  const { dirtyFields, isDirty } = formState;

  const type = watch('type') as MenuNodeType | null;
  const entry = watch('entry');
  const slug = watch('slug');

  console.log({ entry, slug });

  const { createLink } = useCreateLink();
  const { updateLink } = useUpdateLink();

  useEffect(() => {
    if (link) {
      reset(link);
    }
  }, [link, reset]);

  const onOk = handleSubmit(async (data) => {
    try {
      setLoading(true);

      if (!data.id) {
        const response = await createLink({
          title: data.title,
          sortIndex: data.sortIndex,
          entryId: data.entry?.id || null,
          slug: data.entry?.slug || null,
          type: data.type,
          menuId: data.menuId,
        } as any);

        if (!response.data?.linkMutation?.create?.id) {
          return;
        }

        await refetch();
        notify.success(formatMessage({ id: t('menus.linkModal.added') }));
        onClose();
        return;
      }

      const payload = { id: data.id } as ApiUpdateLinkInput;

      if (dirtyFields.title) {
        payload.title = data.title;
      }

      if (dirtyFields.slug) {
        payload.slug = data.slug;
      }

      if (dirtyFields.type) {
        payload.type = data.type;
      }

      if (dirtyFields.entry && data.entry) {
        payload.entryId = data.entry.id;
        payload.slug = data.entry.slug;
      }

      await updateLink(payload);
      await refetch();
      notify.success(formatMessage({ id: t('menus.linkModal.updated') }));
      onClose();
    } catch {
      notify.error(formatMessage({ id: t('menus.linkModal.saveFailed') }));
    } finally {
      setLoading(false);
    }
  });

  const isNewLink = !link?.id;

  const renderSourceControl = () => {
    const EntrySelect = entrySelectMapping[type || ''] || null;

    const resetButton = isNewLink ? (
      <Button
        onClick={() => {
          setValue('entry', null, { shouldDirty: true });
          setValue('type', null, { shouldDirty: true });
          setValue('slug', '', { shouldDirty: true });
        }}
        icon={<MdClose />}
      />
    ) : null;

    if (type && EntrySelect) {
      return (
        <Flex w="100%" direction="column" mt="4" pb="10">
          <Label required>
            {formatMessage({ id: linkLabelIdMapping[type] })}
          </Label>
          <Flex gap="2" w="100%">
            <EntrySelect
              showValue
              multiple={false}
              value={entry ? [entry] : []}
              onChange={(value: any[]) => {
                const [entry] = value;

                if (!entry) {
                  setValue('entry', null, { shouldDirty: true });
                  return;
                }

                if (isNewLink && !dirtyFields.title && entry?.title) {
                  setValue('title', entry.title, { shouldDirty: true });
                }

                if (type === MenuNodeType.Product) {
                  setValue('entry', entry, { shouldDirty: true });
                } else {
                  setValue('entry', entry || null, { shouldDirty: true });
                }
              }}
            />
            {resetButton}
          </Flex>
          {slug && (
            <Flex mt="2">
              <Typography.Text type="secondary" data-testid="link-slug">
                {slug}
              </Typography.Text>
            </Flex>
          )}
        </Flex>
      );
    }

    if (type === MenuNodeType.Link) {
      return (
        <Flex w="100%" direction="column" mt="4" pb="10">
          <Label>{formatMessage({ id: linkLabelIdMapping[type] })}</Label>
          <Flex gap="2" w="100%">
            <Controller
              name="slug"
              control={control}
              render={({ field }) => (
                <Input
                  data-testid="link-url-field"
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="https://..."
                />
              )}
            />
            {resetButton}
          </Flex>
        </Flex>
      );
    }

    return (
      <Flex w="100%" direction="column" mt="4" pb="10">
        <Label>{formatMessage({ id: t('menus.linkModal.source.label') })}</Label>
        <Select
          placeholder={formatMessage({
            id: t('menus.linkModal.source.placeholder'),
          })}
          value={null}
          data-testid="link-type-select"
          onChange={(value: MenuNodeType) => {
            setValue('type', value);
          }}
          options={[
            MenuNodeType.Product,
            MenuNodeType.Category,
            MenuNodeType.Page,
            MenuNodeType.Link,
          ].map((it) => ({
            value: it,
            'data-testid': `link-type-${it}-item`,
            label: formatMessage({ id: linkLabelIdMapping[it] }),
          }))}
        />
      </Flex>
    );
  };

  return (
    <Modal
      destroyOnClose
      open={open}
      width={600}
      title={
        <Flex
          data-testid="feature-modal-header"
          align="center"
          justify="space-between"
          w="100%"
          pr="10"
          css={css`
            width: 100%;
          `}
        >
          {isNewLink
            ? formatMessage({ id: t('menus.linkModal.title.new') })
            : formatMessage({ id: t('menus.linkModal.title.edit') })}
        </Flex>
      }
      onOk={onOk}
      onCancel={onClose}
      cancelButtonProps={{
        'data-testid': 'link-modal-cancel-button',
      }}
      okButtonProps={{
        disabled: !isDirty,
        loading,
        'data-testid': 'link-modal-submit-button',
      }}
      okText={formatMessage({ id: t('common.save') })}
    >
      <ValidationAlert errors={formState.errors} />
      <Controller
        name="title"
        control={control}
        render={({ field }) => {
          return (
            <Flex w="100%" direction="column" mt="4">
              <Label required>
                {formatMessage({ id: t('menus.linkModal.title.label') })}
              </Label>
              <Input
                value={field.value}
                onChange={field.onChange}
                placeholder={formatMessage({
                  id: t('menus.linkModal.title.placeholder'),
                })}
                data-testid="link-title-input"
              />
            </Flex>
          );
        }}
      />
      {renderSourceControl()}
    </Modal>
  );
};
