import { CategorySelect } from '@modules/categories/components/CategorySelect';
import { CrmColumnSelect } from '@modules/crm/components/CrmColumnSelect';
import { CustomerSelect } from '@modules/customers/components/CustomerSelect';
import { PageSelect } from '@modules/pages/components/PageSelect';
import { ProductSelect } from '@modules/products/components/ProductSelect';
import { PaymentMethodSelect } from '@modules/settings/components/payment/PaymentMethodSelect';
import { ShippingMethodSelect } from '@modules/settings/components/shipping/ShippingMethodBrowse';
import { TagSelect } from '@modules/tags/components/TagSelect';
import { EntityType } from '@src/graphql';
import { Input } from 'antd';
import { Variant } from 'antd/es/config-provider';

type IEntity = {
  id: number;
} & any;

interface IUiFilterRelationControlProps {
  onChange: (value: IEntity | IEntity[]) => void;
  status?: 'error';
  isMultiple: boolean;
  value: IEntity | IEntity[];
  entity: string;
  variant?: Variant;
}

export const UiFilterRelationControl = ({
  onChange,
  status,
  isMultiple,
  value,
  entity,
  variant,
}: IUiFilterRelationControlProps) => {
  if (!value) {
    return 'Internal. No value';
  }

  if (entity === EntityType.Category) {
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

  if (entity === EntityType.Page) {
    return (
      <PageSelect
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

  // if (entity === EntityType.Feature) {
  //   return (
  //     <FeatureSelect
  //       showValue
  //       multiple={isMultiple}
  //       status={status}
  //       variant={variant}
  //       onChange={(next) => {
  //         if (isMultiple) {
  //           onChange(next);
  //           return;
  //         }

  //         onChange(next.slice(0, 1));
  //       }}
  //       value={value}
  //     />
  //   );
  // }

  if (entity === EntityType.ProdContainer) {
    return (
      <ProductSelect
        multiple={isMultiple}
        variant={variant}
        value={value}
        showValue
        status={status}
        inListing={false}
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

  if (entity === EntityType.ShipMethod) {
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

  if (entity === EntityType.PayMethod) {
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

  if (entity === EntityType.Customer) {
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

  if (entity === EntityType.Board) {
    return (
      <CrmColumnSelect
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

  if (entity === EntityType.Tag) {
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
