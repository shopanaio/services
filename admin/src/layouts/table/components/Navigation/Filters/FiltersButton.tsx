import { IconButton } from '@components/IconButton';
// import { css } from '@emotion/react';
import { IFiltersProps } from '@src/layouts/table/components/Navigation/Filters/Filters';
import { FiltersModal } from '@src/layouts/table/components/Navigation/Filters/FiltersModal';
import { Button, Space } from 'antd';
import { useState } from 'react';
import { MdAdd } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

// const iconProps = {
//   size: 14,
//   css: css`
//     transform: translateY(2px);
//   `,
// };

export const FilterButton = ({
  disabled,
  ...props
}: IFiltersProps & { disabled?: boolean }) => {
  const [open, setOpen] = useState(false);
  const { formatMessage } = useIntl();

  if (!props.options?.length) {
    return null;
  }

  return (
    <>
      <Space.Compact>
        <Button
          onClick={() => setOpen(true)}
          icon={<MdAdd />}
          disabled={disabled}
        >
          {formatMessage({ id: t('layouts.filters.addFilter') })}
        </Button>
        <IconButton icon="menu" type="default" shape="default" />
      </Space.Compact>
      <FiltersModal open={open} onClose={() => setOpen(false)} {...props} />
    </>
  );
};
