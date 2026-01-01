import { ValidationAlert } from '@components/forms/ValidationAlert';
import { Button, Input, Modal, Select, Typography } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { css } from '@emotion/react';
import { Flex } from '@components/utility/Flex';
import { useEffect } from 'react';
import { Label } from '@components/forms/Label';
import { ApiUpdateLinkInput, MenuNodeType } from '@src/graphql';
import { ProductSelect } from '@modules/products/components/ProductSelect';
import { CategorySelect } from '@modules/categories/components/CategorySelect';
import { PageSelect } from '@modules/pages/components/PageSelect';
import { MdClose } from 'react-icons/md';
import { ILinkFormValue } from '@modules/menus/defs';
import { useCreateLink, useUpdateLink } from '@modules/menus/hooks/link';

interface ILinkModalProps {
  open: boolean;
  onClose: () => void;
  link: ILinkFormValue | null;
  onSubmit: (value: any) => void;
}

const linkLabelMapping: any = {
  [MenuNodeType.Product]: 'Product',
  [MenuNodeType.Category]: 'Category',
  [MenuNodeType.Page]: 'Page',
  [MenuNodeType.Menu]: 'Menu',
  [MenuNodeType.Text]: 'Text',
  [MenuNodeType.Link]: 'Link',
};

const entrySelectMapping: any = {
  [MenuNodeType.Product]: ProductSelect,
  [MenuNodeType.Category]: CategorySelect,
  [MenuNodeType.Page]: PageSelect,
};

export const LinkModal = ({
  open,
  onClose,
  onSubmit,
  link,
}: ILinkModalProps) => {
  const methods = useForm({
    defaultValues: {} as ILinkFormValue,
    // resolver: yupResolver(getAttributeModalSchema(locales)) as any,
  });

  const { control, handleSubmit, formState, reset, watch, setValue } = methods;
  const { dirtyFields, isDirty } = formState;

  const type = watch('type') as MenuNodeType | null;
  const entry = watch('entry');
  const slug = watch('slug');

  const { createLink } = useCreateLink();
  const { updateLink } = useUpdateLink();

  useEffect(() => {
    if (link) {
      reset(link);
    }
  }, [link, reset]);

  const onOk = handleSubmit(async (data) => {
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

      const { id } = response.data.linkMutation.create;

      onSubmit({ ...data, id });
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
    onSubmit(data);
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
        icon={<MdClose   />}
      />
    ) : null;

    if (type && EntrySelect) {
      return (
        <Flex w="100%" direction="column" mt="4" pb="10">
          <Label required>{linkLabelMapping[type]}</Label>
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

                if (isNewLink && !dirtyFields.title) {
                  setValue('title', entry.title, { shouldDirty: true });
                }

                setValue('entry', entry || null, { shouldDirty: true });
              }}
            />
            {resetButton}
          </Flex>
          {slug && (
            <Flex mt="2">
              <Typography.Text type="secondary">
                https://.../ {slug}
              </Typography.Text>
            </Flex>
          )}
        </Flex>
      );
    }

    if (type === MenuNodeType.Link) {
      return (
        <Flex w="100%" direction="column" mt="4" pb="10">
          <Label required>{linkLabelMapping[type]}</Label>
          <Flex gap="2" w="100%">
            <Controller
              name="slug"
              control={control}
              render={({ field }) => (
                <Input
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

    if (type === MenuNodeType.Text) {
      return (
        <Flex w="100%" direction="column" mt="4" pb="10">
          <Label required>{linkLabelMapping[type]}</Label>
          <Flex gap="2" w="100%">
            <Input readOnly value="Text" />
            {resetButton}
          </Flex>
        </Flex>
      );
    }

    return (
      <Flex w="100%" direction="column" mt="4" pb="10">
        <Label>Source</Label>
        <Select
          placeholder="Select source type"
          value={null}
          onChange={(value: MenuNodeType) => {
            setValue('type', value);
          }}
          options={Object.values(MenuNodeType)
            .filter((it) => ![MenuNodeType.Menu].includes(it))
            .map((it) => ({
              value: it,
              label: linkLabelMapping[it],
            }))}
        />
      </Flex>
    );
  };

  return (
    <Modal
      destroyOnClose
      open={open}
      width={1000}
      transitionName="ant-fade"
      maskTransitionName="ant-fade"
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
          {isNewLink ? 'New link' : 'Link'}
        </Flex>
      }
      onOk={onOk}
      onCancel={onClose}
      cancelButtonProps={{
        'data-testid': 'modal-cancel-button',
      }}
      okButtonProps={{
        disabled: !isDirty,
        'data-testid': 'modal-submit-button',
      }}
      okText="Save"
    >
      <ValidationAlert errors={formState.errors} />
      <Controller
        name="title"
        control={control}
        render={({ field }) => {
          return (
            <Flex w="100%" direction="column" mt="4">
              <Label required>Title</Label>
              <Input
                value={field.value}
                onChange={field.onChange}
                placeholder="Enter title"
                data-testid="feature-title-input"
              />
            </Flex>
          );
        }}
      />
      {renderSourceControl()}
    </Modal>
  );
};
