import { Modal, Select } from 'antd';
import { useLocales } from '@modules/locales/hooks/useLocales';
import { useState } from 'react';
import { allowedLocales, shopLocales } from '@src/defs/localization/locales';
import { useAddLocale } from '@modules/settings/hooks/useUpdateLocales';
import { notify } from '@components/feedback/notification';

interface ILocalesModalProps {
  open: boolean;
  onClose: () => void;
}

export const AddLanguageModal = ({ open, onClose }: ILocalesModalProps) => {
  const { locales } = useLocales();
  const [loading, setLoading] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<string | null>(null);
  const { addLocale } = useAddLocale();
  const localeRecord = locales.reduce(
    (acc, locale) => {
      acc[locale.code] = locale;
      return acc;
    },
    {} as Record<string, { code: string; title: string }>,
  );

  const onOk = async () => {
    if (!selectedLocale) {
      return;
    }

    try {
      setLoading(true);
      await addLocale(selectedLocale!);
      onClose();
      notify.success('Language added');
    } catch {
      notify.error('Failed to add language');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      width={600}
      title="Add language"
      onCancel={onClose}
      cancelButtonProps={{
        'data-testid': 'add-language-modal-cancel-button',
      }}
      okButtonProps={{
        loading,
        'data-testid': 'add-language-modal-submit-button',
      }}
      okText="Confirm"
      onOk={onOk}
    >
      <Select
        showSearch
        value={selectedLocale}
        onChange={(value) => {
          setSelectedLocale(value);
        }}
        style={{ width: '100%' }}
        placeholder="Select language"
        data-testid="language-select"
        options={shopLocales
          .filter(
            (it) =>
              allowedLocales.includes(it.value) && !localeRecord[it.value],
          )
          .map((it) => ({
            value: it.value,
            label: it.name,
            'data-testid': `language-select-item-${it.value}`,
          }))
          .sort((a, b) => a.label.localeCompare(b.label))}
      />
    </Modal>
  );
};
