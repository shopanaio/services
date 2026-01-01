import { CategorySelect } from '@modules/categories/components/CategorySelect';
import { CustomerSelect } from '@modules/customers/components/CustomerSelect';
import { FeatureSelect } from '@modules/features/components/FeatureSelect';
import { ProductSelect } from '@modules/products/components/ProductSelect';
import { OrderBoardSelect } from '@modules/settings/components/boards/OrderBoardSelect';
import { PaymentMethodSelect } from '@modules/settings/components/payment/PaymentMethodSelect';
import { ShippingMethodSelect } from '@modules/settings/components/shipping/ShippingMethodSelect';
import { TagSelect } from '@modules/tags/components/TagSelect';
import { Entity } from '@src/defs/entities';
import { Input } from 'antd';
import { Variant } from 'antd/es/form/hooks/useVariants';

type IEntity = {
  id: number;
} & any;

interface IRelationControlProps {
  onChange: (value: IEntity | IEntity[]) => void;
  status?: 'error';
  isMultiple: boolean;
  value: IEntity | IEntity[];
  entity: string;
  variant?: Variant;
}

export const RelationControl = ({
  onChange,
  status,
  isMultiple,
  value,
  entity,
  variant,
}: IRelationControlProps) => {
  if (!value) {
    return 'Internal. No value';
  }

  if (entity === Entity.Category) {
    return (
      <CategorySelect
        status={status}
        multiple={isMultiple}
        variant={variant}
        onChange={(next) => {
          if (isMultiple) {
            onChange(next);
            return;
          }

          onChange(next.slice(0, 1));
        }}
        value={value}
        showValue
      />
    );
  }

  if (entity === Entity.Feature) {
    return (
      <FeatureSelect
        multiple={isMultiple}
        status={status}
        variant={variant}
        onChange={(next) => {
          if (isMultiple) {
            onChange(next);
            return;
          }

          onChange(next.slice(0, 1));
        }}
        value={value}
      />
    );
  }

  if (entity === Entity.ProdContainer) {
    return (
      <ProductSelect
        multiple={isMultiple}
        variant={variant}
        value={value}
        showValue
        status={status}
        onChange={(next) => {
          if (isMultiple) {
            onChange(next);
            return;
          }

          onChange(next.slice(0, 1));
        }}
      />
    );
  }

  if (entity === Entity.ShipMethod) {
    return (
      <ShippingMethodSelect
        multiple={isMultiple}
        value={value}
        variant={variant}
        showValue
        status={status}
        onChange={(next) => {
          if (isMultiple) {
            onChange(next);
            return;
          }

          onChange(next.slice(0, 1));
        }}
      />
    );
  }

  if (entity === Entity.PayMethod) {
    return (
      <PaymentMethodSelect
        multiple={isMultiple}
        variant={variant}
        value={value}
        showValue
        status={status}
        onChange={(next) => {
          if (isMultiple) {
            onChange(next);
            return;
          }

          onChange(next.slice(0, 1));
        }}
      />
    );
  }

  if (entity === Entity.Customer) {
    return (
      <CustomerSelect
        multiple={isMultiple}
        value={value}
        variant={variant}
        showValue
        status={status}
        onChange={(next) => {
          if (isMultiple) {
            onChange(next);
            return;
          }

          onChange(next.slice(0, 1));
        }}
      />
    );
  }

  if (entity === Entity.Board) {
    return (
      <OrderBoardSelect
        variant={variant}
        multiple={isMultiple}
        value={value}
        showValue
        status={status}
        onChange={(next) => {
          if (isMultiple) {
            onChange(next);
            return;
          }

          onChange(next.slice(0, 1));
        }}
      />
    );
  }

  if (entity === Entity.Tag) {
    return (
      <TagSelect
        variant={variant}
        multiple={isMultiple}
        value={value}
        showValue
        status={status}
        onChange={(next) => {
          if (isMultiple) {
            onChange(next);
            return;
          }

          onChange(next.slice(0, 1));
        }}
      />
    );
  }

  return <Input disabled />;
};
