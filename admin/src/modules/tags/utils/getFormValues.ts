import { ITagFormValues } from '@modules/tags/types';
import { ITag } from '@src/entity/Tag/Tag';
import { TagColor } from '@src/graphql';

export const getTagFormValues = (tag: ITag): ITagFormValues => {
  return {
    title: tag.title,
    color: (tag.color as TagColor.Default) || TagColor.Default,
  };
};
