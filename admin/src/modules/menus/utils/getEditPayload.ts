import { flattenTree } from '@components/sortableTree/utilities';
import { IMenuFormValues } from '@modules/menus/defs';
import { IMenu } from '@src/entity/Menu/Menu';
import { ApiUpdateMenuInput } from '@src/graphql';
import { NIL_UUID } from '@src/utils/synthetic-id';
import { FieldNamesMarkedBoolean } from 'react-hook-form';

export const getEditMenuPayload = ({
  id,
  data,
  dirtyFields,
}: {
  id: ID;
  data: IMenuFormValues;
  dirtyFields: FieldNamesMarkedBoolean<IMenuFormValues>;
}): ApiUpdateMenuInput => {
  const payload = { id } as ApiUpdateMenuInput;

  if (dirtyFields.title) {
    payload.title = data.title;
  }

  if (dirtyFields.slug) {
    payload.slug = data.slug;
  }

  if (dirtyFields.status) {
    payload.status = data.status;
  }

  if (dirtyFields.menuItems) {
    payload.items = flattenTree(data.menuItems).map((it) => ({
      id: it.id,
      parentId: it.parentId || NIL_UUID,
      sortIndex: it.index,
    }));
  }

  return payload;
};
