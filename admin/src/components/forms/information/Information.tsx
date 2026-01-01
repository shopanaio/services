import { Label } from '@/components/forms/Label';
import { Slug } from '@/components/forms/slug/Slug';
import { Flex } from '@/components/utility/Flex';
import { css } from '@emotion/react';
import { DrawerPaper } from '@/layouts/drawer/components/DrawerPaper';
import { Input, InputProps, Tabs } from 'antd';
import { Controller } from 'react-hook-form';
import { IDescriptionFields } from '@/domains/inventory/products/types';

interface IInformationProps {
  titleInputProps?: InputProps;
  description?: boolean;
  slug?: 'auto' | 'custom' | 'disabled';
  onDescriptionSave?: (values: IDescriptionFields | null) => void;
}

export const Information = ({
  slug,
  description,
  titleInputProps,
  onDescriptionSave,
}: IInformationProps) => {
  return (
    <DrawerPaper>
      <Flex w="100%" gap="4">
        <Controller
          key="title"
          name="title"
          render={({ field, fieldState }) => {
            return (
              <Flex direction="column" grow="1">
                <Label required>Title</Label>
                <Input
                  {...titleInputProps}
                  value={field.value}
                  data-testid="title-input"
                  onChange={field.onChange}
                  placeholder="Title"
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
                label: 'Description',
                children: (
                  <Controller
                    key="description"
                    name="description"
                    render={({ field }) => (
                      <Input.TextArea
                        rows={8}
                        placeholder="Enter product description..."
                        value={field.value?.text || ''}
                        onChange={(e) => {
                          const text = e.target.value;
                          field.onChange({
                            text,
                            html: `<p>${text}</p>`,
                            json: {},
                          });
                        }}
                        data-testid="description-editor"
                        css={css`
                          min-height: 200px !important;
                          padding: var(--x3) var(--x4);
                        `}
                      />
                    )}
                  />
                ),
              },
              {
                key: 'excerpt',
                label: 'Excerpt',
                children: (
                  <Controller
                    key="excerpt"
                    name="excerpt"
                    render={({ field }) => {
                      return (
                        <Input.TextArea
                          rows={10}
                          placeholder="Short description for listings"
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
                label: 'SEO',
                children: (
                  <Flex gap="4" direction="column">
                    <Controller
                      key="seoTitle"
                      name="seoTitle"
                      render={({ field }) => {
                        return (
                          <Input
                            placeholder="SEO Title"
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
                            placeholder="SEO Description"
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
