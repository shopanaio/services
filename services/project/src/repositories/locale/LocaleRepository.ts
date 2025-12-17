import { BaseRepository } from "../BaseRepository.js";

export interface CreateLocaleData {
  code: string;
  isActive?: boolean;
}

export interface UpdateLocaleData {
  isActive?: boolean;
}

export class LocaleRepository extends BaseRepository {
  // TODO
}
