import { useSelector } from '@reframework/qx';
import { EntityModal } from '@src/layouts/modals/components/Modal';
import { $modals } from '@src/layouts/modals/store/modals';
import { IEntityModalItem } from '@src/layouts/modals/types';

interface IModalsProps {
  items: IEntityModalItem[];
  level?: number;
}

const NestedModals = ({ items, level = 0 }: IModalsProps) => {
  const [current, ...rest] = items;

  const isCurrent = !rest?.length;

  return (
    <EntityModal modalItem={current} level={level}>
      {!isCurrent && <NestedModals items={rest} level={level + 1} />}
    </EntityModal>
  );
};

export const Modals = () => {
  const modals = useSelector($modals.modals);

  if (!modals.length) {
    return null;
  }

  return <NestedModals items={modals} />;
};
