import { BaseRepository } from "../BaseRepository.js";

export interface CreateApiKeyData {
  name: string;
  createdById: string;
  dueDate?: Date | null;
}

export class ApiKeyRepository extends BaseRepository {
  // TODO
}
