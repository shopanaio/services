import { Box } from '@components/utility/Box';
import { FiltersControl } from '@src/layouts/table/components/Navigation/Filters/Conditions/Conditions';
import { IFiltersProps } from '@src/layouts/table/components/Navigation/Filters/Filters';
import { Modal } from 'antd';

export const FiltersModal = ({
  open,
  onClose,
  onChange,
  options,
  value,
}: {
  open: boolean;
  onClose: () => void;
} & IFiltersProps) => {
  const onCancel = () => {
    onChange([]);
    onClose();
  };

  return (
    <Modal
      title="Filters"
      open={open}
      onCancel={onCancel}
      onOk={onClose}
      width={1000}
      transitionName="ant-fade"
      maskTransitionName="ant-fade"
    >
      <Box pt="4" pb="10" w="100%">
        {open && (
          <FiltersControl options={options} value={value} onChange={onChange} />
        )}
      </Box>
    </Modal>
  );
};
