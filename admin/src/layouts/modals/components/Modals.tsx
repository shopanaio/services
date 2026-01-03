import { useSelector } from '@reframework/qx';
import { EntityModal } from '@src/layouts/modals/components/Modal';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { IEntityDrawerItem } from '@src/layouts/drawers/types';

interface IModalsProps {
  items: IEntityDrawerItem[];
  totalCount: number;
  level?: number;
}

const NestedModals = ({ items, totalCount, level = 0 }: IModalsProps) => {
  const [current, ...rest] = items;

  const isCurrent = !rest?.length;

  return (
    <EntityModal modalItem={current} level={level} totalCount={totalCount}>
      {!isCurrent && (
        <NestedModals items={rest} totalCount={totalCount} level={level + 1} />
      )}
    </EntityModal>
  );
};

export const Modals = () => {
  const drawers = useSelector($drawers.drawers);

  if (!drawers.length) {
    return null;
  }

  return <NestedModals items={drawers} totalCount={drawers.length} />;
};
