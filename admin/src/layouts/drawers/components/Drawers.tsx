import { useSelector } from '@reframework/qx';
import { EntityDrawer } from '@src/layouts/drawers/components/Drawer';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { IEntityDrawerItem } from '@src/layouts/drawers/types';

interface IDrawersProps {
  items: IEntityDrawerItem[];
  level?: number;
}

const NestedDrawers = ({ items, level = 0 }: IDrawersProps) => {
  const [current, ...rest] = items;

  const isCurrent = !rest?.length;

  return (
    <EntityDrawer drawerItem={current} level={level}>
      {!isCurrent && <NestedDrawers items={rest} level={level + 1} />}
    </EntityDrawer>
  );
};

export const Drawers = () => {
  const drawers = useSelector($drawers.drawers);

  if (!drawers.length) {
    return null;
  }

  return <NestedDrawers items={drawers} />;
};
