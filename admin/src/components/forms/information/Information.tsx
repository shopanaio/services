import { RichTextEditor } from '@components/editor/Remirror';
import { Label } from '@components/forms/Label';
import { Slug } from '@components/forms/slug/Slug';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { Input, InputProps, Tabs } from 'antd';
import { Controller } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
import { IDescriptionFields } from '@src/entity/Content/description';

interface IInformationProps {
  titleInputProps?: InputProps;
  description?: boolean;
  slug?: 'auto' | 'custom' | 'disabled';
  /**
   * Called when the rich text editor Save button is pressed.
   * Use to persist description and refresh state.
   */
  onDescriptionSave?: (values: IDescriptionFields | null) => void;
}

export const Information = ({
  slug,
  description,
  titleInputProps,
  onDescriptionSave,
}: IInformationProps) => {
  const { formatMessage } = useIntl();
  return (
    <DrawerPaper>
      <Flex w="100%" gap="4">
        <Controller
          key="title"
          name="title"
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label required>
                  <FormattedMessage id={t('common.title')} />
                </Label>
                <Input
                  {...titleInputProps}
                  value={field.value}
                  data-testid="title-input"
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('common.title') })}
                  status={fieldState?.invalid ? 'error' : undefined}
                  maxLength={255}
                  showCount={{
                    formatter: ({ count, maxLength }) => {
                      return `${count} / ${maxLength}`;
                    },
                  }}
                />
              </Flex>
            );
          }}
        />
        {slug && <Slug sync={slug === 'auto'} disabled={slug === 'disabled'} />}
      </Flex>
      {description && (
        <Flex mt="4">
          <Tabs
            size="small"
            style={{ width: '100%' }}
            items={[
              {
                key: 'description',
                label: <FormattedMessage id={t('common.description')} />,
                children: (
                  <Controller
                    key="description"
                    name="description"
                    render={({ field }) => (
                      <RichTextEditor
                        initialContent={field.value}
                        onChange={field.onChange}
                        onSaveDone={onDescriptionSave}
                        height="200px"
                        data-testid="description-editor"
                        placeholder={formatMessage({ id: t('common.description') })}
                      />
                    )}
                  />
                ),
              },
              {
                key: 'excerpt',
                label: <FormattedMessage id={t('common.excerpt')} />,
                children: (
                  <Controller
                    key="excerpt"
                    name="excerpt"
                    render={({ field }) => {
                      return (
                        <Input.TextArea
                          rows={10}
                          placeholder={formatMessage({ id: t('common.excerpt') })}
                          value={field.value}
                          onChange={field.onChange}
                          data-testid="excerpt-editor"
                          maxLength={300}
                          css={css`
                            min-height: 258px !important;
                            padding: var(--x3) var(--x4);
                          `}
                        />
                      );
                    }}
                  />
                ),
              },
              {
                key: 'seo',
                label: <FormattedMessage id={t('common.seo')} />,
                children: (
                  <Flex gap="4" direction="column">
                    <Controller
                      key="seoTitle"
                      name="seoTitle"
                      render={({ field }) => {
                        return (
                          <Input
                            placeholder={formatMessage({ id: t('common.seoTitle') })}
                            value={field.value}
                            onChange={field.onChange}
                            data-testid="seo-title-field"
                            showCount
                            maxLength={255}
                          />
                        );
                      }}
                    />
                    <Controller
                      key="seoDescription"
                      name="seoDescription"
                      render={({ field }) => {
                        return (
                          <Input.TextArea
                            rows={8}
                            placeholder={formatMessage({ id: t('common.seoDescription') })}
                            value={field.value}
                            onChange={field.onChange}
                            maxLength={300}
                            data-testid="seo-description-field"
                            css={css`
                              min-height: 210px !important;
                              padding: var(--x3) var(--x4);
                            `}
                          />
                        );
                      }}
                    />
                  </Flex>
                ),
              },
            ]}
          />
        </Flex>
      )}
    </DrawerPaper>
  );
};
