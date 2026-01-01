import { Information } from '@components/forms/information/Information';
import { Flex } from '@components/utility/Flex';
import { TranslateInput } from '@modules/translations/components/forms/Input';
import {
  IConnectionTranslationItem,
  IGenericTranslationData,
} from '@modules/translations/types';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Divider, Typography } from 'antd';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
import { Controller, useFormContext } from 'react-hook-form';

type Segment = {
  header?: { index: number; item: IConnectionTranslationItem };
  items: Array<{ index: number; item: IConnectionTranslationItem }>;
};

const FeaturesInputs = ({
  features,
}: {
  features: IConnectionTranslationItem[];
}) => {
  const { control } = useFormContext();
  const intl = useIntl();

  const segments: Segment[] = [];
  let currentSegment: Segment | null = null;
  (features || []).forEach((item, index) => {
    if ((item as any).isGroup) {
      const seg: Segment = { header: { index, item }, items: [] };
      segments.push(seg);
      currentSegment = seg;
    } else {
      if (!currentSegment) {
        currentSegment = { items: [] };
        segments.push(currentSegment);
      }
      currentSegment.items.push({ index, item });
    }
  });

  if (!segments.length) {
    return (
      <Typography.Text type="secondary">
        {intl.formatMessage({
          id: t('translations.noFeatures'),
        })}
      </Typography.Text>
    );
  }

  return (
    <>
      {segments.map((seg, segIdx) => {
        const header = seg.header;
        return (
          <>
            {segIdx > 0 && <Divider />}
            <div
              key={`seg-${segIdx}`}
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(2, 1fr)`,
                gap: '16px',
              }}
            >
              {header && (
                <Controller
                  key={`g-${header.item.id}`}
                  name={`features.${header.index}.translation`}
                  control={control}
                  render={({ field }) => (
                    <div>
                      <TranslateInput
                        label={
                          header.item.label ||
                          intl.formatMessage({
                            id: t('translations.noTranslation'),
                          })
                        }
                        name={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        data-testid={`group-${segIdx}-input`}
                      />
                    </div>
                  )}
                />
              )}
              {seg.items.length ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '16px',
                  }}
                >
                  {seg.items.map(({ index, item }) => (
                    <Controller
                      key={item.id}
                      name={`features.${index}.translation`}
                      control={control}
                      render={({ field }) => (
                        <TranslateInput
                          label={
                            item.label ||
                            intl.formatMessage({
                              id: t('translations.noTranslation'),
                            })
                          }
                          name={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          data-testid={`value-${index}-input`}
                        />
                      )}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </>
        );
      })}
    </>
  );
};

const VariantsInputs = ({
  variants,
  hasVariants,
}: {
  variants: IConnectionTranslationItem[];
  hasVariants: boolean;
}) => {
  const { control } = useFormContext();
  const intl = useIntl();

  if (!hasVariants) {
    return (
      <Typography.Text type="secondary">
        {intl.formatMessage({ id: t('translations.noVariants') })}
      </Typography.Text>
    );
  }

  return (
    <Flex direction="column" gap="4">
      {(variants || []).map((it, idx) => (
        <Controller
          key={it.id}
          name={`variants.${idx}.translation`}
          control={control}
          render={({ field }) => (
            <TranslateInput
              label={
                it.label ||
                intl.formatMessage({ id: t('translations.noTranslation') })
              }
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              data-testid={`variant-${idx}-input`}
            />
          )}
        />
      ))}
    </Flex>
  );
};

const ComponentsInputs = ({
  groups,
}: {
  groups: IConnectionTranslationItem[];
}) => {
  const { control } = useFormContext();
  const intl = useIntl();

  if (!groups?.length) {
    return (
      <Typography.Text type="secondary">
        {intl.formatMessage({ id: t('translations.noComponents') })}
      </Typography.Text>
    );
  }

  return (
    <Flex direction="column" gap="4">
      {(groups || []).map((it, idx) => (
        <Controller
          key={it.id}
          name={`groups.${idx}.translation`}
          control={control}
          render={({ field }) => (
            <TranslateInput
              label={
                it.label ||
                intl.formatMessage({ id: t('translations.noTranslation') })
              }
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              data-testid={`component-${idx}-input`}
            />
          )}
        />
      ))}
    </Flex>
  );
};

export const TranslateProductFormComponent = ({
  data,
}: {
  data: IGenericTranslationData & {
    hasVariants: boolean;
  };
}) => {
  const { hasVariants } = data;
  const { getValues } = useFormContext();
  const intl = useIntl();

  const features: IConnectionTranslationItem[] = getValues('features');
  const variants: IConnectionTranslationItem[] = getValues('variants');
  const groups: IConnectionTranslationItem[] = getValues('groups');

  return (
    <>
      <Information description />
      <DrawerPaper>
        <DrawerPaperHeader
          title={intl.formatMessage({ id: t('translations.options') })}
          name="options"
        />
        <FeaturesInputs features={features} />
      </DrawerPaper>
      <DrawerPaper>
        <DrawerPaperHeader
          title={intl.formatMessage({ id: t('translations.variants') })}
          name="variants"
        />
        <VariantsInputs variants={variants} hasVariants={hasVariants} />
      </DrawerPaper>
      <DrawerPaper>
        <DrawerPaperHeader
          title={intl.formatMessage({ id: t('translations.components') })}
          name="components"
        />
        <ComponentsInputs groups={groups} />
      </DrawerPaper>
    </>
  );
};
