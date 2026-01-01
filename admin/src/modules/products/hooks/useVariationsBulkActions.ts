export enum EntityActions {
  PUBLISH = 'publish',
  DRAFT = 'draft',
  ARCHIVE = 'archive',
  RESTORE = 'restore',
  EDIT = 'edit',
  DELETE = 'delete',
}

export interface IEntityActionOption {
  action: EntityActions;
  color: string;
  icon: string;
  onClick: () => void;
  title: string;
}

const actions: Record<EntityActions, Omit<IEntityActionOption, 'onClick'>> = {
  [EntityActions.PUBLISH]: {
    action: EntityActions.PUBLISH,
    color: 'primary',
    icon: 'FiSend',
    title: 'Publish',
  },
  [EntityActions.DRAFT]: {
    action: EntityActions.DRAFT,
    color: 'secondary',
    icon: 'RiDraftLine',
    title: 'Draft',
  },
  [EntityActions.ARCHIVE]: {
    action: EntityActions.ARCHIVE,
    color: 'error',
    icon: 'RiDeleteBin6Line',
    title: 'Archive',
  },
  [EntityActions.RESTORE]: {
    action: EntityActions.RESTORE,
    color: 'secondary',
    icon: 'MdOutlineRestoreFromTrash',
    title: 'Restore',
  },
  [EntityActions.EDIT]: {
    action: EntityActions.EDIT,
    color: 'secondary',
    icon: 'RiEdit2Fill',
    title: 'Bulk editing',
  },
  [EntityActions.DELETE]: {
    action: EntityActions.DELETE,
    color: 'secondary',
    icon: 'TiDeleteOutline',
    title: 'Trash',
  },
} as const;

export interface IBulkActions {
  options: IEntityActionOption[];
}

export const useVariationsBulkActions = (params: {
  status: 'new' | 'deleted';
  onSubmit: (action: EntityActions) => void;
}): IBulkActions => {
  const { status, onSubmit } = params;

  let options = [actions.publish, actions.edit, actions.draft, actions.archive];

  if (status === 'new') {
    options = [actions.edit, actions.delete];
  }

  if (status === 'deleted') {
    options = [actions.restore];
  }

  return {
    options: options.map((it) => ({
      ...it,
      onClick: () => onSubmit(it.action),
    })),
  };
};
