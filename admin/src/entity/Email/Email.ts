import {
  ApiEmailProfiles,
  ApiEmailSettings,
  ApiEmailTemplate,
  EmailTypeEnum,
} from '@src/graphql';

export interface IEmailTemplate {
  id: number;
  subject: string;
  body: string;
  type: EmailTypeEnum;
  createdAt: Date;
  updatedAt: Date;
}

export class EmailTemplate {
  static create(data: ApiEmailTemplate): IEmailTemplate {
    return {
      id: data.id,
      subject: data.subject,
      body: data.template,
      type: data.type as EmailTypeEnum,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }
}

export interface IEmailSettings {
  from: string;
  replyTo: string;
  createdAt: Date;
  updatedAt: Date;
}

export class EmailSettings {
  static create(data: ApiEmailSettings): IEmailSettings {
    return {
      from: data.from,
      replyTo: data.replyTo,
      updatedAt: new Date(data.updatedAt),
      createdAt: new Date(data.createdAt),
    };
  }
}

export interface IEmailProfile {
  host: string;
  port: number;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

export class EmailProfile {
  static create(data: ApiEmailProfiles): IEmailProfile {
    return {
      host: data.host,
      port: data.port,
      updatedAt: new Date(data.updatedAt),
      username: data.username,
      createdAt: new Date(data.createdAt),
    };
  }
}
