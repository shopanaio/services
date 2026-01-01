import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { useLocales } from '@modules/locales/hooks/useLocales';
import { AddLanguageModal } from '@modules/settings/components/general/AddLanguageModal';
import {
  useDeleteLocale,
  useSetDefaultLocale,
} from '@modules/settings/hooks/useUpdateLocales';
import { IProjectInfo } from '@src/entity/Project/Project';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { App, Dropdown, Tag, Typography } from 'antd';
import { partition } from 'lodash';
import { useState } from 'react';
import { MdAdd, MdMoreHoriz, MdTranslate } from 'react-icons/md';
import { shopLocalesRecord } from '@src/defs/localization/locales';
import { notify } from '@components/feedback/notification';
import { useIntl, FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

export const StoreLanguages = ({ project }: { project: IProjectInfo }) => {
  const { formatMessage } = useIntl();
  const { locale: defaultCode } = project;
  const [modalOpen, setModalOpen] = useState(false);
  const { locales } = useLocales();
  const { deleteLocale } = useDeleteLocale();
  const { setDefaultLocale } = useSetDefaultLocale();
  const { modal } = App.useApp();

  const [[defaultLocale], secondaryLocales] = partition(locales, (locale) => {
    return locale.code === defaultCode;
  });

  if (!locales?.length) {
    return null;
  }

  const openDeleteModal = (locale: string) => {
    const { name: title } = shopLocalesRecord[locale];

    modal.confirm({
      icon: null,
      title: formatMessage({ id: t('settings.languages.deleteConfirmTitle') }),
      okButtonProps: {
        'data-testid': 'delete-language-modal-submit-button',
      },
      cancelButtonProps: {
        'data-testid': 'delete-language-modal-cancel-button',
      },
      content: (
        <>
          <FormattedMessage
            id={t('settings.languages.deleteConfirmContent')}
            values={{ title: <Typography.Text code>{title}</Typography.Text> }}
          />
        </>
      ),
      onOk: async () => {
        try {
          await deleteLocale(locale);
          notify.success(formatMessage({ id: t('settings.languages.deleted') }));
        } catch {
          notify.error(
            formatMessage({ id: t('settings.languages.deleteFailed') }),
          );
        }
      },
      okText: formatMessage({ id: t('common.delete') }),
    });
  };

  const openSetDefaultModal = (locale: string) => {
    const { name: title } = shopLocalesRecord[locale];
    modal.confirm({
      icon: null,
      title: formatMessage({ id: t('settings.languages.setDefaultConfirmTitle') }),
      okButtonProps: {
        'data-testid': 'set-default-language-modal-submit-button',
      },
      cancelButtonProps: {
        'data-testid': 'set-default-language-modal-cancel-button',
      },
      content: (
        <>
          <FormattedMessage
            id={t('settings.languages.setDefaultConfirmContent')}
            values={{ title: <Typography.Text code>{title}</Typography.Text> }}
          />
        </>
      ),
      onOk: async () => {
        try {
          await setDefaultLocale(locale);
          notify.success(
            formatMessage({ id: t('settings.languages.setDefaultSuccess') }),
          );
        } catch {
          notify.error(
            formatMessage({ id: t('settings.languages.setDefaultFailed') }),
          );
        }
      },
    });
  };

  return (
    <>
      <DrawerPaper key="lang">
        <DrawerPaperHeader
          name="languages"
          title={<FormattedMessage id={t('settings.languages.title')} />}
        />
        <Flex direction="column" gap="4">
          <Flex align="center" gap="4">
            <MdTranslate size={20} />
            <Box>
              <Typography.Text type="secondary">
                <FormattedMessage id={t('settings.languages.storeLanguages')} />
              </Typography.Text>
              <Box mt="1">
                <Tag
                  color="blue-inverse"
                  data-testid={`language-item-default-${defaultLocale.code}`}
                >
                  {defaultLocale.title}
                </Tag>
                {secondaryLocales.map((locale) => (
                  <Dropdown
                    trigger={['click']}
                    key={locale.code}
                    menu={{
                      items: [
                        {
                          key: 'set-as-default',
                          label: (
                            <FormattedMessage
                              id={t('settings.languages.setAsDefault')}
                            />
                          ),
                          onClick: () => {
                            openSetDefaultModal(locale.code);
                          },
                          // @ts-expect-error
                          'data-testid': `set-default-language-item-${locale.code}`,
                        },
                        {
                          key: 'delete',
                          label: (
                            <FormattedMessage
                              id={t('settings.languages.deleteLanguage')}
                            />
                          ),
                          onClick: () => {
                            openDeleteModal(locale.code);
                          },
                          // @ts-expect-error
                          'data-testid': `delete-language-item-${locale.code}`,
                        },
                      ],
                    }}
                  >
                    <Tag
                      color="blue"
                      role="button"
                      onClick={() => {}}
                      style={{ cursor: 'pointer' }}
                      data-testid={`language-item-${locale.code}`}
                    >
                      <Flex align="center" gap="2">
                        {locale.title}
                        <MdMoreHoriz />
                      </Flex>
                    </Tag>
                  </Dropdown>
                ))}
                <Tag
                  role="button"
                  data-testid="add-language-button"
                  color="default"
                  key="new"
                  onClick={() => {
                    setModalOpen(true);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <Flex align="center" gap="2">
                    <MdAdd />
                    <FormattedMessage id={t('settings.languages.add')} />
                  </Flex>
                </Tag>
              </Box>
            </Box>
          </Flex>
        </Flex>
      </DrawerPaper>
      <AddLanguageModal
        onClose={() => {
          setModalOpen(false);
        }}
        open={modalOpen}
      />
    </>
  );
};
