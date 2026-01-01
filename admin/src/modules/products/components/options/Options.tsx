import { Paper } from '@components/paper/Paper';
import { css } from '@emotion/react';
import { ProductFeaturesTable } from '@modules/products/components/options/Table';
import { IProductFeatureGroup } from '@src/entity/Product/ProductFeature';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { syntheticId } from '@src/utils/synthetic-id';
import { Button } from 'antd';
import { ReactNode } from 'react';
import { useFormContext } from 'react-hook-form';
import { MdAdd } from 'react-icons/md';
import { FormattedMessage } from 'react-intl';

export const featureFormPropsMapping = {
  attributes: {
    name: 'attributes',
    title: <FormattedMessage id="products.tabs.features" />,
    itemTitle: 'feature',
    noItemsText: <FormattedMessage id="products.options.noFeatures" />,
  },
  options: {
    name: 'options',
    title: <FormattedMessage id="products.tabs.optionsVariants" />,
    itemTitle: 'option',
    noItemsText: <FormattedMessage id="products.options.noOptions" />,
  },
} as const;

export interface IFeatureCallbacks {
  onSort: (items: any[]) => void;
  onDone: (initialRecordId: ID, option: IProductFeatureGroup) => void;
  onDelete: (id: ID) => void;
}

export const Features = ({
  type,
  children,
  onSort,
  onDelete,
  onDone,
  loading,
}: {
  type: 'attributes' | 'options';
  children?: ReactNode;
  loading: boolean;
} & IFeatureCallbacks) => {
  const { name, title } = featureFormPropsMapping[type];

  const { setValue, watch } = useFormContext();
  const features = watch(name);

  const isEditing = features.some((it: IProductFeatureGroup) => it.isEditing);

  const setOptions = (next: IProductFeatureGroup[]) => {
    setValue(name, next, { shouldDirty: true });
  };

  const onAdd = () => {
    setOptions([
      ...features,
      {
        isEditing: true,
        id: syntheticId(),
        title: '',
        features: [],
      },
    ]);
  };

  return (
    <DrawerPaper
      css={css`
        display: flex;
        flex-direction: column;
        gap: var(--x4);
      `}
    >
      <DrawerPaperHeader
        title={title}
        name={name}
        extra={
          <Button
            icon={<MdAdd />}
            onClick={onAdd}
            data-testid={`add-${name}-button`}
          />
        }
      />

      {features.length > 0 && (
        <Paper>
          <ProductFeaturesTable
            name={name}
            value={features}
            isEditing={isEditing}
            onChange={setOptions}
            onSort={onSort}
            onDone={onDone}
            onDelete={onDelete}
            loading={loading}
          />
        </Paper>
      )}

      {children}
    </DrawerPaper>
  );
};
