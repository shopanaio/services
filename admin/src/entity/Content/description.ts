import { emptyRemirrorJSON } from '@components/editor/Remirror/utils';
import { ApiDescriptionFieldsInput } from '@src/graphql';
import { RemirrorJSON } from 'remirror';

export interface IDescriptionFields {
  json: RemirrorJSON;
  html: string;
  text: string;
}

const parseApiRemirrorJSON = (
  value: string | null | undefined,
): RemirrorJSON | null => {
  if (!value) {
    return null;
  }

  try {
    const json = JSON.parse(value);
    if (!json.data) {
      return null;
    }

    return json.data;
  } catch (e) {
    console.error('Error parsing JSON', e);
    return null;
  }
};

export const getDescriptionFields = (
  apiRichTextJSONString: string | null,
): IDescriptionFields => ({
  json: parseApiRemirrorJSON(apiRichTextJSONString) || emptyRemirrorJSON,
  html: '',
  text: '',
});

export const getApiRichTextJSON = (
  description: IDescriptionFields | null,
): ApiDescriptionFieldsInput | null => {
  if (!description) {
    return null;
  }

  return {
    html: description.html,
    json: JSON.stringify({ data: description.json }),
    text: description.text,
  };
};
