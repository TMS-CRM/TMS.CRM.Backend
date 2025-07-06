import { randomUUID } from 'crypto';
import type { TenantDatabase } from '../../models/entities/tenant.js';

export class TenantDatabaseBuilder {
  private tenantDatabase: TenantDatabase;

  private constructor() {
    this.tenantDatabase = {
      external_uuid: randomUUID(),
      created_on: new Date(Date.now() - 86400000), // 24 hrs
    } as unknown as TenantDatabase;
  }

  withName(value: string): this {
    this.tenantDatabase.name = value;
    return this;
  }

  withDeletedOn(value: string): this {
    this.tenantDatabase.deleted_on = value;
    return this;
  }

  build(): TenantDatabase {
    return this.tenantDatabase;
  }

  static make(): TenantDatabaseBuilder {
    return new TenantDatabaseBuilder();
  }
}
