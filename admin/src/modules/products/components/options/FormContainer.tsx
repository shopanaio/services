import { ValidationAlert } from '@components/forms/ValidationAlert';
import { yupResolver } from '@hookform/resolvers/yup';
import { OptionForm } from '@modules/products/components/options/Form';
import {
  defaultValues,
  getOptionModalSchema,
  IProductOptionFormValues,
} from '@modules/products/components/options/schema';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Flex } from '@components/utility/Flex';
import {
  IProductFeature,
  IProductFeatureGroup,
} from '@src/entity/Product/ProductFeature';
import { Button } from 'antd';
import { hasRealId } from '@src/utils/synthetic-id';

interface IProductFeatureModalProps {
  name: string;
  onClose: () => void;
  option: IProductFeatureGroup | null;
  onSubmit: (value: IProductFeatureGroup) => void;
  loading: boolean;
}

export const OptionFormContainer = ({
  name,
  option: initial,
  onClose,
  onSubmit,
  loading,
}: IProductFeatureModalProps) => {
  const methods = useForm<IProductOptionFormValues>({
    defaultValues,
    // @ts-expect-error - TODO: fix this
    resolver: yupResolver(getOptionModalSchema()),
  });

  const { control, handleSubmit, formState, reset, watch } = methods;

  const option = watch('option');
  const featureValues: IProductFeature[] = watch('features');
  const isNew = !hasRealId(option);

  useEffect(() => {
    if (!initial || !hasRealId(initial)) {
      return;
    }

    reset({
      option: initial,
      features: initial?.features || defaultValues.features,
    });
  }, [initial, reset]);

  const onOk = handleSubmit(async (data) => {
    if (!data.option) {
      return;
    }

    if (!isNew) {
      onSubmit({
        ...data.option,
        features: data.features,
      });

      return;
    }

    onSubmit({
      features: featureValues,
      id: data.option.id,
      slug: data.option.slug,
      style: data.option.style,
      title: data.option.title,
      isActive: true,
      isEditing: false,
      isOption: true,
    });
  });

  return (
    <Flex px="2" py="2" gap="4" direction="column">
      <ValidationAlert errors={formState.errors} />
      <OptionForm control={control as any} />
      <Flex gap="4" justify="flex-start">
        <Button
          type="primary"
          disabled={!formState.isDirty}
          loading={loading}
          data-testid={`submit-${name}-button`}
          onClick={onOk}
        >
          Done
        </Button>
        <Button data-testid={`cancel-${name}-button`} onClick={onClose}>
          Cancel
        </Button>
      </Flex>
    </Flex>
  );
};
