import { randomUUID } from 'crypto';
import type { UserDatabase } from '../../models/entities/user.js';

export class UserDatabaseBuilder {
  private userDatabase: Partial<UserDatabase>;

  private constructor() {
    this.userDatabase = {
      external_uuid: randomUUID(),
      cognito_uuid: randomUUID(),
      created_on: new Date(Date.now() - 86400000).toISOString(), // 24 hrs
    };
  }

  withFirstName(value: string): this {
    this.userDatabase.first_name = value;
    return this;
  }

  withLastName(value: string): this {
    this.userDatabase.last_name = value;
    return this;
  }

  withEmail(value: string): this {
    this.userDatabase.email = value;
    return this;
  }

  withCognitoUuid(value: string): this {
    this.userDatabase.cognito_uuid = value;
    return this;
  }

  build(): Partial<UserDatabase> {
    return this.userDatabase;
  }

  static make(): UserDatabaseBuilder {
    return new UserDatabaseBuilder();
  }
}
