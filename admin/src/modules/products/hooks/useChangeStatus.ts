// import { message } from '@components/message/message';
// import { API_ROUTES } from '@src/defs/api-routes';

import { Entity } from '@src/defs/entities';
import { EntityStatus } from '@src/graphql';

import { useMutation } from 'react-query';

const getConfirmMessage = (status: EntityStatus) => {
  if (status === EntityStatus.Published) {
    return 'Are you sure? All checked entries will be published';
  }

  if (status === EntityStatus.Draft) {
    return 'Are you sure? All checked entries will be drafted';
  }

  if (status === EntityStatus.Archived) {
    return 'Are you sure? All checked entries will be deleted';
  }
};

export const useChangeStatus = () => {
  const { mutate } = useMutation(async (): Promise<void> => {
    // TODO: update many
  });

  return (props: {
    checkedRows: number[];
    status: EntityStatus;
    onSuccess?: (status: EntityStatus) => void;
    onError?: () => void;
    entity: Entity;
  }) => {
    const { checkedRows, onError, onSuccess, status, entity } = props;

    if (!window.confirm(getConfirmMessage(status))) {
      return;
    }

    mutate(
      {
        items: checkedRows,
        status: status!,
        entity,
      } as any,
      {
        onSuccess: () => {
          onSuccess?.(status!);
        },
        onError: () => {
          // notify.error();
          onError?.();
        },
      },
    );
  };
};
