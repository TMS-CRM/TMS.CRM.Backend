import type { PostUserRequestPayload, PublicUser, PutUserRequestPayload } from '../api/payloads/user.js';

export interface UserDatabase {
  id: number;
  external_uuid: string;
  cognito_uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  created_on: string;
  modified_on: string | null;
  deleted_on: string | null;
}

export class User {
  public id: number;
  public externalUuid: string;
  public cognitoUuid: string;
  public firstName: string;
  public lastName: string;
  public email: string;
  public createdOn: string;
  public modifiedOn: string | null;
  public deletedOn: string | null;

  public constructor(data: UserDatabase) {
    this.id = data.id;
    this.externalUuid = data.external_uuid;
    this.cognitoUuid = data.cognito_uuid;
    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.email = data.email;
    this.createdOn = data.created_on;
    this.modifiedOn = data.modified_on;
    this.deletedOn = data.deleted_on;
  }

  /** Convert the PostUserRequestPayload to a Partial<UserDatabase> */
  public static create(payload: PostUserRequestPayload): Partial<UserDatabase> {
    return {
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
    };
  }

  /** Convert the PutUserRequestPayload to a Partial<UserDatabase> */
  public static update(payload: PutUserRequestPayload): Partial<UserDatabase> {
    return {
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      modified_on: new Date().toISOString(),
    };
  }

  /** Convert the User to a PublicUser */
  public toPublic(): PublicUser {
    return {
      uuid: this.externalUuid,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      createdOn: this.createdOn,
      modifiedOn: this.modifiedOn ?? null,
      deletedOn: this.deletedOn ?? null,
    };
  }
}
