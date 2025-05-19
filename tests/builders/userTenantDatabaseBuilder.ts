import type { UserTenantDatabase } from '../../models/entities/userTenant.js';

export class UserTenantDatabaseBuilder {
  private userTenantDatabase: UserTenantDatabase;

  private constructor() {
    this.userTenantDatabase = {
      user_id: 0,
      tenant_id: 0,
    } as unknown as UserTenantDatabase;
  }

  withUserId(value: number): this {
    this.userTenantDatabase.user_id = value;
    return this;
  }

  withTenantId(value: number): this {
    this.userTenantDatabase.tenant_id = value;
    return this;
  }

  build(): UserTenantDatabase {
    return this.userTenantDatabase;
  }

  static make(): UserTenantDatabaseBuilder {
    return new UserTenantDatabaseBuilder();
  }
}
