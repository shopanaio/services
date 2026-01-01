import { ValidationAlert } from '@components/forms/ValidationAlert';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  getGroupFormSchema,
  IProductGroupFormValues,
} from '@modules/products/components/groups/schema';
import { useForm } from 'react-hook-form';
import { Flex } from '@components/utility/Flex';

import { Button } from 'antd';
import { IProductGroupItem } from '@src/entity/ProductGroup/ProductGroupItem';
import { ProductGroupForm } from '@modules/products/components/groups/GroupForm';

interface IProductGroupModalProps {
  onClose: () => void;
  group: IProductGroupFormValues;
  onSubmit: (value: IProductGroupFormValues) => void;
  loading: boolean;
}

export const ProductGroupItem = ({
  group: initial,
  onClose,
  onSubmit,
  loading,
}: IProductGroupModalProps) => {
  const methods = useForm({
    defaultValues: initial,
    resolver: yupResolver(getGroupFormSchema()),
  });

  const { control, handleSubmit, formState, setValue, watch } = methods;

  const items: IProductGroupItem[] = watch('items');

  const setItems = (value: IProductGroupItem[]) => {
    setValue('items', value, { shouldDirty: true });
  };

  const onOk = handleSubmit((data) => {
    onSubmit(data as IProductGroupFormValues);
  });

  return (
    <Flex px="2" py="2" gap="4" direction="column">
      <ValidationAlert errors={formState.errors} />
      <ProductGroupForm control={control} items={items} setItems={setItems} />
      <Flex gap="4" justify="flex-start">
        <Button
          type="primary"
          disabled={!formState.isDirty}
          data-testid="submit-group-button"
          onClick={onOk}
          loading={loading}
        >
          Done
        </Button>
        <Button data-testid="cancel-group-button" onClick={onClose}>
          Cancel
        </Button>
      </Flex>
    </Flex>
  );
};
