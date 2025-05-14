import { randomUUID } from 'crypto';
import type { IUserEntry } from '../../models/entities/userEntry.js';

export class UserEntryBuilder {
  private userEntry: Partial<IUserEntry>;

  private constructor() {
    this.userEntry = {
      ExternalUuid: randomUUID(),
      CognitoUuid: randomUUID(),
      CreatedOn: new Date(Date.now() - 86400000).toISOString(), // 24 hrs
    };
  }

  withFirstName(value: string): this {
    this.userEntry.FirstName = value;
    return this;
  }

  withLastName(value: string): this {
    this.userEntry.LastName = value;
    return this;
  }

  withEmail(value: string): this {
    this.userEntry.Email = value;
    return this;
  }

  withCognitoUuid(value: string): this {
    this.userEntry.CognitoUuid = value;
    return this;
  }

  build(): Partial<IUserEntry> {
    return this.userEntry;
  }

  static make(): UserEntryBuilder {
    return new UserEntryBuilder();
  }
}
