/* eslint-disable jsx-a11y/no-autofocus */
import { notify } from '@components/feedback/notification';
import { Label } from '@components/forms/Label';
import { Flex } from '@components/utility/Flex';
import { FeatureGroupBrowse } from '@modules/features/components/FeatureGroupBrowse';
import { useCreateFeatureGroup } from '@modules/features/hooks/useCreateFeatureGroup';
import { useFetchFeatureGroup } from '@modules/features/hooks/useFeatureGroup';
import { IProductOptionFormValues } from '@modules/products/components/options/schema';
import { FeatureGroupAutocomplete } from '@modules/products/components/selects/FeatureGroupAutocomplete';
import { IProductFeature } from '@src/entity/Product/ProductFeature';
import { hasRealId } from '@src/utils/synthetic-id';
import { mapEntryId } from '@src/utils/utils';
import { uniq } from 'lodash';
import { useState } from 'react';
import { Control, useWatch } from 'react-hook-form';
import { MdSearch } from 'react-icons/md';
import { useIntl } from 'react-intl';

interface INewOptionFormProps {
  control: Control<IProductOptionFormValues>;
  onSetOption: (value: any) => void;
  setFeatures: (value: IProductFeature[]) => void;
  features: IProductFeature[];
}

export const NewOptionForm = ({ onSetOption }: INewOptionFormProps) => {
  const intl = useIntl();
  const attributes = useWatch({ name: 'attributes' });
  const options = useWatch({ name: 'options' });

  const [loading, setLoading] = useState(false);

  const { fetchFeatureGroup } = useFetchFeatureGroup();
  const { createFeatureGroup } = useCreateFeatureGroup();

  const notIn = uniq([
    ...(attributes || []).filter(hasRealId).map(mapEntryId),
    ...(options || []).filter(hasRealId).map(mapEntryId),
  ]);

  const onCreate = async (title: string) => {
    try {
      setLoading(true);
      const id = await createFeatureGroup(title);
      if (id) {
        onSetOption(await fetchFeatureGroup(id));
      }
    } catch {
      notify.error(
        intl.formatMessage({
          id: 'products.options.createFeatureFailed',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex w="100%" align="flex-end" gap="4">
      <Flex w="100%" direction="column">
        <Label required>{intl.formatMessage({ id: 'common.title' })}</Label>
        <FeatureGroupAutocomplete
          data-testid="feature-group-autocomplete"
          value={null}
          onCreate={onCreate}
          onChange={onSetOption}
          loading={loading}
          notIn={notIn}
        />
      </Flex>
      <FeatureGroupBrowse
        notIn={notIn}
        value={[]}
        buttonProps={{
          children: null,
          icon: <MdSearch />,
          loading,
        }}
        multiple={false}
        onChange={(value) => {
          onSetOption(value?.[0] || null);
        }}
      />
    </Flex>
  );
};
