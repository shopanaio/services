import { Information } from '@components/forms/information/Information';
import { Paper } from '@components/paper/Paper';
import { Flex } from '@components/utility/Flex';
import { TranslateInput } from '@modules/translations/components/forms/Input';
import { IConnectionTranslationItem } from '@modules/translations/types';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Typography } from 'antd';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
import { Controller, useFormContext } from 'react-hook-form';

export const TranslateMenuFormComponent = () => {
  const { getValues } = useFormContext();
  const links: IConnectionTranslationItem[] = getValues('links');
  const intl = useIntl();

  return (
    <>
      <Information />
      <DrawerPaper>
        <DrawerPaperHeader
          title={intl.formatMessage({ id: t('translations.links') })}
          name="links"
        />
        {links?.length ? (
          <Flex direction="column" gap="4">
            {(links || []).map((it, idx) => (
              <Controller
                key={it.id}
                name={`links.${idx}.translation`}
                render={({ field }) => (
                  <TranslateInput
                    label={
                      it.label ??
                      `${intl.formatMessage({ id: t('translations.link') })} ${
                        idx + 1
                      }`
                    }
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    data-testid={`link-${idx}-input`}
                  />
                )}
              />
            ))}
          </Flex>
        ) : (
          <Typography.Text type="secondary">
            {intl.formatMessage({ id: t('translations.noLinks') })}
          </Typography.Text>
        )}
      </DrawerPaper>
    </>
  );
};
