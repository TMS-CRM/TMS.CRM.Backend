import type { PostUserRequestPayload, PublicUser, PutUserRequestPayload } from '../api/payloads/user.js';

export interface IUserEntry {
  Id: number;
  ExternalUuid: string;
  CognitoUuid: string;
  FirstName: string;
  LastName: string;
  Email: string;
  CreatedOn: string;
  ModifiedOn: string | null;
  DeletedOn: string | null;
}

export class UserEntry implements IUserEntry {
  public Id: number;
  public ExternalUuid: string;
  public CognitoUuid: string;
  public FirstName: string;
  public LastName: string;
  public Email: string;
  public CreatedOn: string;
  public ModifiedOn: string | null;
  public DeletedOn: string | null;

  public constructor(data: IUserEntry) {
    this.Id = data.Id;
    this.ExternalUuid = data.ExternalUuid;
    this.CognitoUuid = data.CognitoUuid;
    this.FirstName = data.FirstName;
    this.LastName = data.LastName;
    this.Email = data.Email;
    this.CreatedOn = data.CreatedOn;
    this.ModifiedOn = data.ModifiedOn;
    this.DeletedOn = data.DeletedOn;
  }

  /** Convert the PostUserRequestPayload to a Partial<UserEntry> */
  public static fromPostRequestPayload(payload: PostUserRequestPayload): Partial<UserEntry> {
    return {
      FirstName: payload.firstName,
      LastName: payload.lastName,
      Email: payload.email,
    };
  }

  /** Convert the PutUserRequestPayload to a Partial<UserEntry> */
  public static fromPutRequestPayload(payload: PutUserRequestPayload): Partial<UserEntry> {
    return {
      FirstName: payload.firstName,
      LastName: payload.lastName,
      Email: payload.email,
      ModifiedOn: new Date().toISOString(),
    };
  }

  /** Convert the UserEntry to a PublicUser */
  public toPublic(): PublicUser {
    return {
      uuid: this.ExternalUuid,
      firstName: this.FirstName,
      lastName: this.LastName,
      email: this.Email,
      createdOn: this.CreatedOn,
      modifiedOn: this.ModifiedOn ?? null,
    };
  }
}
