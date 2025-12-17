import { BaseRepository } from "../BaseRepository.js";
import { type ApiKey } from "../models/index.js";

export interface CreateApiKeyData {
  name: string;
  createdById: string;
  dueDate?: Date | null;
}

export class ApiKeyRepository extends BaseRepository {
  // TODO
}
